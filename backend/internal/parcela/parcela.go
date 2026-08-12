package parcela

import (
	"encoding/json"
	"net/http"
	"strconv"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

type Handler struct {
	pool *pgxpool.Pool
}

func NewHandler(pool *pgxpool.Pool) *Handler {
	return &Handler{pool: pool}
}

func (h *Handler) Routes(r chi.Router) {
	r.Get("/", h.listByMonth)
	r.Post("/{id}/pagar", h.marcarPaga)
	r.Post("/{id}/despagar", h.despagar)
	r.Post("/{id}/abater", h.abater)
}

type parcelaDoMes struct {
	ID               int     `json:"id"`
	VendaID          int     `json:"venda_id"`
	ClienteID        int     `json:"cliente_id"`
	ClienteNome      string  `json:"cliente_nome"`
	ClienteTelefone  string  `json:"cliente_telefone"`
	ClienteWhatsApp  string  `json:"cliente_whatsapp"`
	Tipo             string  `json:"tipo"`
	DescricaoProduto string  `json:"descricao_produto"`
	Numero           int     `json:"numero"`
	NumParcelas      int     `json:"num_parcelas"`
	Valor            float64 `json:"valor"`
	Vencimento       string  `json:"vencimento"`
	Status           string  `json:"status"` // pendente | atrasada | paga
}

// listByMonth lista as parcelas cujo vencimento cai no mês/ano informado
// via query params ?ano=2026&mes=11 (padrão: mês atual).
func (h *Handler) listByMonth(w http.ResponseWriter, r *http.Request) {
	now := time.Now()
	ano := now.Year()
	mes := int(now.Month())

	if v := r.URL.Query().Get("ano"); v != "" {
		if parsed, err := strconv.Atoi(v); err == nil {
			ano = parsed
		}
	}
	if v := r.URL.Query().Get("mes"); v != "" {
		if parsed, err := strconv.Atoi(v); err == nil {
			mes = parsed
		}
	}

	inicio := time.Date(ano, time.Month(mes), 1, 0, 0, 0, 0, time.UTC)
	fim := inicio.AddDate(0, 1, 0)

	rows, err := h.pool.Query(r.Context(), `
		SELECT p.id, p.venda_id, c.id, c.nome, COALESCE(c.telefone,''), COALESCE(c.whatsapp,''),
		       v.tipo, v.descricao_produto, p.numero, v.num_parcelas, p.valor, p.vencimento, p.status
		FROM parcelas p
		JOIN vendas v ON v.id = p.venda_id
		JOIN clientes c ON c.id = v.cliente_id
		WHERE p.vencimento >= $1 AND p.vencimento < $2
		ORDER BY p.vencimento, c.nome`, inicio, fim)
	if err != nil {
		http.Error(w, "erro ao buscar parcelas", http.StatusInternalServerError)
		return
	}
	defer rows.Close()

	hoje := time.Now().Truncate(24 * time.Hour)
	resultado := []parcelaDoMes{}
	for rows.Next() {
		var p parcelaDoMes
		var venc time.Time
		if err := rows.Scan(&p.ID, &p.VendaID, &p.ClienteID, &p.ClienteNome, &p.ClienteTelefone, &p.ClienteWhatsApp,
			&p.Tipo, &p.DescricaoProduto, &p.Numero, &p.NumParcelas, &p.Valor, &venc, &p.Status); err != nil {
			http.Error(w, "erro ao ler parcelas", http.StatusInternalServerError)
			return
		}
		p.Vencimento = venc.Format("2006-01-02")
		if p.Status == "pendente" && venc.Before(hoje) {
			p.Status = "atrasada"
		}
		resultado = append(resultado, p)
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(resultado)
}

func (h *Handler) marcarPaga(w http.ResponseWriter, r *http.Request) {
	id, err := strconv.Atoi(chi.URLParam(r, "id"))
	if err != nil {
		http.Error(w, "id inválido", http.StatusBadRequest)
		return
	}

	ctx := r.Context()
	tag, err := h.pool.Exec(ctx,
		`UPDATE parcelas SET status = 'paga', valor_pago = valor, pago_em = now() WHERE id = $1`, id)
	if err != nil {
		http.Error(w, "erro ao marcar parcela como paga", http.StatusInternalServerError)
		return
	}
	if tag.RowsAffected() == 0 {
		http.Error(w, "parcela não encontrada", http.StatusNotFound)
		return
	}

	if _, err := h.pool.Exec(ctx,
		`UPDATE casa_lancamentos SET status = 'paga', valor_realizado = valor_previsto, data_pagamento = now() WHERE venda_parcela_id = $1`, id,
	); err != nil {
		http.Error(w, "erro ao atualizar receita em Gastos da Casa", http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusNoContent)
}

// despagar reverte uma parcela para pendente, zerando o quanto já foi pago.
func (h *Handler) despagar(w http.ResponseWriter, r *http.Request) {
	id, err := strconv.Atoi(chi.URLParam(r, "id"))
	if err != nil {
		http.Error(w, "id inválido", http.StatusBadRequest)
		return
	}

	ctx := r.Context()
	tag, err := h.pool.Exec(ctx,
		`UPDATE parcelas SET status = 'pendente', valor_pago = 0, pago_em = NULL WHERE id = $1`, id)
	if err != nil {
		http.Error(w, "erro ao despagar parcela", http.StatusInternalServerError)
		return
	}
	if tag.RowsAffected() == 0 {
		http.Error(w, "parcela não encontrada", http.StatusNotFound)
		return
	}

	if _, err := h.pool.Exec(ctx,
		`UPDATE casa_lancamentos SET status = 'pendente', valor_realizado = 0, data_pagamento = NULL WHERE venda_parcela_id = $1`, id,
	); err != nil {
		http.Error(w, "erro ao atualizar receita em Gastos da Casa", http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusNoContent)
}

type abaterRequest struct {
	Valor float64 `json:"valor"`
}

// abater soma um abatimento parcial ao valor já pago da parcela. Quando o
// valor pago atinge o valor total, a parcela é marcada como paga automaticamente.
func (h *Handler) abater(w http.ResponseWriter, r *http.Request) {
	id, err := strconv.Atoi(chi.URLParam(r, "id"))
	if err != nil {
		http.Error(w, "id inválido", http.StatusBadRequest)
		return
	}

	var req abaterRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil || req.Valor <= 0 {
		http.Error(w, "informe um valor de abatimento maior que zero", http.StatusBadRequest)
		return
	}

	ctx := r.Context()
	var valor, valorPago float64
	var status string
	err = h.pool.QueryRow(ctx,
		`SELECT valor, valor_pago, status FROM parcelas WHERE id = $1`, id,
	).Scan(&valor, &valorPago, &status)
	if err != nil {
		http.Error(w, "parcela não encontrada", http.StatusNotFound)
		return
	}
	if status == "paga" {
		http.Error(w, "parcela já está paga", http.StatusBadRequest)
		return
	}

	novoValorPago := valorPago + req.Valor
	novoStatus := "pendente"
	var pagoEm interface{} = nil
	if novoValorPago >= valor {
		novoValorPago = valor
		novoStatus = "paga"
		pagoEm = time.Now()
	}

	_, err = h.pool.Exec(ctx,
		`UPDATE parcelas SET valor_pago = $1, status = $2, pago_em = $3 WHERE id = $4`,
		novoValorPago, novoStatus, pagoEm, id)
	if err != nil {
		http.Error(w, "erro ao abater valor", http.StatusInternalServerError)
		return
	}

	if _, err := h.pool.Exec(ctx,
		`UPDATE casa_lancamentos SET valor_realizado = $1, status = $2, data_pagamento = $3 WHERE venda_parcela_id = $4`,
		novoValorPago, novoStatus, pagoEm, id,
	); err != nil {
		http.Error(w, "erro ao atualizar receita em Gastos da Casa", http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusNoContent)
}
