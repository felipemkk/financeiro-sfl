package venda

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
	r.Post("/", h.create)
	r.Get("/cliente/{clienteID}", h.listByCliente)
	r.Get("/{id}", h.getByID)
	r.Post("/{id}/quitar", h.quitar)
	r.Put("/{id}/investido", h.atualizarInvestido)
}

type createRequest struct {
	ClienteID           int     `json:"cliente_id"`
	Tipo                string  `json:"tipo"` // "produto" | "emprestimo"
	DescricaoProduto    string  `json:"descricao_produto"`
	ValorTotal          float64 `json:"valor_total"`
	ValorInvestido      float64 `json:"valor_investido"`
	NumParcelas         int     `json:"num_parcelas"`
	DataPrimeiraParcela string  `json:"data_primeira_parcela"` // formato YYYY-MM-DD
}

type parcelaResponse struct {
	ID         int     `json:"id"`
	Numero     int     `json:"numero"`
	Valor      float64 `json:"valor"`
	ValorPago  float64 `json:"valor_pago"`
	Vencimento string  `json:"vencimento"`
	Status     string  `json:"status"`
}

type vendaResponse struct {
	ID                  int               `json:"id"`
	ClienteID           int               `json:"cliente_id"`
	Tipo                string            `json:"tipo"`
	DescricaoProduto    string            `json:"descricao_produto"`
	ValorTotal          float64           `json:"valor_total"`
	ValorInvestido      float64           `json:"valor_investido"`
	Lucro               float64           `json:"lucro"`
	NumParcelas         int               `json:"num_parcelas"`
	DataPrimeiraParcela string            `json:"data_primeira_parcela"`
	Parcelas            []parcelaResponse `json:"parcelas"`
}

func (h *Handler) create(w http.ResponseWriter, r *http.Request) {
	var req createRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "corpo inválido", http.StatusBadRequest)
		return
	}

	if req.ClienteID == 0 || req.DescricaoProduto == "" || req.ValorTotal <= 0 || req.NumParcelas <= 0 {
		http.Error(w, "dados obrigatórios: cliente_id, descricao_produto, valor_total, num_parcelas", http.StatusBadRequest)
		return
	}
	if req.Tipo != "emprestimo" {
		req.Tipo = "produto"
	}

	dataInicio, err := time.Parse("2006-01-02", req.DataPrimeiraParcela)
	if err != nil {
		http.Error(w, "data_primeira_parcela deve estar no formato YYYY-MM-DD", http.StatusBadRequest)
		return
	}

	ctx := r.Context()
	tx, err := h.pool.Begin(ctx)
	if err != nil {
		http.Error(w, "erro ao iniciar transação", http.StatusInternalServerError)
		return
	}
	defer tx.Rollback(ctx)

	var vendaID int
	err = tx.QueryRow(ctx,
		`INSERT INTO vendas (cliente_id, tipo, descricao_produto, valor_total, valor_investido, num_parcelas, data_primeira_parcela)
		 VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id`,
		req.ClienteID, req.Tipo, req.DescricaoProduto, req.ValorTotal, req.ValorInvestido, req.NumParcelas, dataInicio,
	).Scan(&vendaID)
	if err != nil {
		http.Error(w, "erro ao criar venda (cliente existe?)", http.StatusBadRequest)
		return
	}

	var clienteNome string
	if err := tx.QueryRow(ctx, `SELECT nome FROM clientes WHERE id = $1`, req.ClienteID).Scan(&clienteNome); err != nil {
		http.Error(w, "erro ao buscar cliente", http.StatusInternalServerError)
		return
	}
	categoriaCasa := "Vendas"
	if req.Tipo == "emprestimo" {
		categoriaCasa = "Empréstimos recebidos"
	}
	descricaoCasa := clienteNome + " — " + req.DescricaoProduto

	parcelasGeradas := GerarParcelas(req.ValorTotal, req.NumParcelas, dataInicio)
	parcelas := make([]parcelaResponse, 0, len(parcelasGeradas))
	for _, p := range parcelasGeradas {
		var parcelaID int
		err = tx.QueryRow(ctx,
			`INSERT INTO parcelas (venda_id, numero, valor, vencimento, status)
			 VALUES ($1, $2, $3, $4, 'pendente') RETURNING id`,
			vendaID, p.Numero, p.Valor, p.Vencimento,
		).Scan(&parcelaID)
		if err != nil {
			http.Error(w, "erro ao criar parcelas", http.StatusInternalServerError)
			return
		}
		parcelas = append(parcelas, parcelaResponse{
			ID:         parcelaID,
			Numero:     p.Numero,
			Valor:      p.Valor,
			ValorPago:  0,
			Vencimento: p.Vencimento.Format("2006-01-02"),
			Status:     "pendente",
		})

		// Toda parcela de venda vira uma receita prevista em Gastos da Casa,
		// já que o dinheiro recebido dela entra no caixa da casa.
		_, err = tx.Exec(ctx,
			`INSERT INTO casa_lancamentos (tipo, categoria, descricao, valor_previsto, data_vencimento, competencia_ano, competencia_mes, venda_parcela_id)
			 VALUES ('receita', $1, $2, $3, $4, $5, $6, $7)`,
			categoriaCasa, descricaoCasa, p.Valor, p.Vencimento, p.Vencimento.Year(), int(p.Vencimento.Month()), parcelaID,
		)
		if err != nil {
			http.Error(w, "erro ao gerar receita em Gastos da Casa", http.StatusInternalServerError)
			return
		}
	}

	if err := tx.Commit(ctx); err != nil {
		http.Error(w, "erro ao confirmar transação", http.StatusInternalServerError)
		return
	}

	resp := vendaResponse{
		ID:                  vendaID,
		ClienteID:           req.ClienteID,
		Tipo:                req.Tipo,
		DescricaoProduto:    req.DescricaoProduto,
		ValorTotal:          req.ValorTotal,
		ValorInvestido:      req.ValorInvestido,
		Lucro:               req.ValorTotal - req.ValorInvestido,
		NumParcelas:         req.NumParcelas,
		DataPrimeiraParcela: dataInicio.Format("2006-01-02"),
		Parcelas:            parcelas,
	}

	w.WriteHeader(http.StatusCreated)
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(resp)
}

func (h *Handler) listByCliente(w http.ResponseWriter, r *http.Request) {
	clienteID, err := strconv.Atoi(chi.URLParam(r, "clienteID"))
	if err != nil {
		http.Error(w, "id inválido", http.StatusBadRequest)
		return
	}

	rows, err := h.pool.Query(r.Context(),
		`SELECT id, cliente_id, tipo, descricao_produto, valor_total, valor_investido, num_parcelas, data_primeira_parcela
		 FROM vendas WHERE cliente_id = $1 ORDER BY criada_em DESC`, clienteID)
	if err != nil {
		http.Error(w, "erro ao buscar vendas", http.StatusInternalServerError)
		return
	}
	defer rows.Close()

	vendas := []vendaResponse{}
	for rows.Next() {
		var v vendaResponse
		var dataInicio time.Time
		if err := rows.Scan(&v.ID, &v.ClienteID, &v.Tipo, &v.DescricaoProduto, &v.ValorTotal, &v.ValorInvestido, &v.NumParcelas, &dataInicio); err != nil {
			http.Error(w, "erro ao ler vendas", http.StatusInternalServerError)
			return
		}
		v.DataPrimeiraParcela = dataInicio.Format("2006-01-02")
		v.Lucro = v.ValorTotal - v.ValorInvestido
		vendas = append(vendas, v)
	}
	rows.Close()

	for i := range vendas {
		parcelas, err := h.carregarParcelas(r, vendas[i].ID)
		if err != nil {
			http.Error(w, "erro ao buscar parcelas", http.StatusInternalServerError)
			return
		}
		vendas[i].Parcelas = parcelas
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(vendas)
}

func (h *Handler) getByID(w http.ResponseWriter, r *http.Request) {
	id, err := strconv.Atoi(chi.URLParam(r, "id"))
	if err != nil {
		http.Error(w, "id inválido", http.StatusBadRequest)
		return
	}

	v, err := h.carregarVenda(r, id)
	if err != nil {
		http.Error(w, "venda não encontrada", http.StatusNotFound)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(v)
}

// quitar marca todas as parcelas pendentes de uma venda como pagas.
func (h *Handler) quitar(w http.ResponseWriter, r *http.Request) {
	id, err := strconv.Atoi(chi.URLParam(r, "id"))
	if err != nil {
		http.Error(w, "id inválido", http.StatusBadRequest)
		return
	}

	ctx := r.Context()
	tag, err := h.pool.Exec(ctx,
		`UPDATE parcelas SET status = 'paga', valor_pago = valor, pago_em = now()
		 WHERE venda_id = $1 AND status <> 'paga'`, id)
	if err != nil {
		http.Error(w, "erro ao quitar venda", http.StatusInternalServerError)
		return
	}
	if tag.RowsAffected() == 0 {
		var existe bool
		h.pool.QueryRow(ctx, `SELECT EXISTS(SELECT 1 FROM vendas WHERE id = $1)`, id).Scan(&existe)
		if !existe {
			http.Error(w, "venda não encontrada", http.StatusNotFound)
			return
		}
	}

	if _, err := h.pool.Exec(ctx,
		`UPDATE casa_lancamentos SET status = 'paga', valor_realizado = valor_previsto, data_pagamento = now()
		 WHERE venda_parcela_id IN (SELECT id FROM parcelas WHERE venda_id = $1) AND status <> 'paga'`, id,
	); err != nil {
		http.Error(w, "erro ao atualizar receita em Gastos da Casa", http.StatusInternalServerError)
		return
	}

	v, err := h.carregarVenda(r, id)
	if err != nil {
		http.Error(w, "erro ao carregar venda quitada", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(v)
}

type atualizarInvestidoRequest struct {
	ValorInvestido float64 `json:"valor_investido"`
}

// atualizarInvestido permite corrigir o valor investido de uma venda já
// registrada (ex: vendas antigas criadas antes desse campo existir, ou
// ajustes posteriores).
func (h *Handler) atualizarInvestido(w http.ResponseWriter, r *http.Request) {
	id, err := strconv.Atoi(chi.URLParam(r, "id"))
	if err != nil {
		http.Error(w, "id inválido", http.StatusBadRequest)
		return
	}

	var req atualizarInvestidoRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil || req.ValorInvestido < 0 {
		http.Error(w, "informe um valor_investido válido", http.StatusBadRequest)
		return
	}

	tag, err := h.pool.Exec(r.Context(),
		`UPDATE vendas SET valor_investido = $1 WHERE id = $2`, req.ValorInvestido, id)
	if err != nil {
		http.Error(w, "erro ao atualizar valor investido", http.StatusInternalServerError)
		return
	}
	if tag.RowsAffected() == 0 {
		http.Error(w, "venda não encontrada", http.StatusNotFound)
		return
	}

	v, err := h.carregarVenda(r, id)
	if err != nil {
		http.Error(w, "erro ao carregar venda atualizada", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(v)
}

func (h *Handler) carregarVenda(r *http.Request, id int) (vendaResponse, error) {
	var v vendaResponse
	var dataInicio time.Time
	err := h.pool.QueryRow(r.Context(),
		`SELECT id, cliente_id, tipo, descricao_produto, valor_total, valor_investido, num_parcelas, data_primeira_parcela
		 FROM vendas WHERE id = $1`, id,
	).Scan(&v.ID, &v.ClienteID, &v.Tipo, &v.DescricaoProduto, &v.ValorTotal, &v.ValorInvestido, &v.NumParcelas, &dataInicio)
	if err != nil {
		return vendaResponse{}, err
	}
	v.DataPrimeiraParcela = dataInicio.Format("2006-01-02")
	v.Lucro = v.ValorTotal - v.ValorInvestido

	parcelas, err := h.carregarParcelas(r, v.ID)
	if err != nil {
		return vendaResponse{}, err
	}
	v.Parcelas = parcelas
	return v, nil
}

func (h *Handler) carregarParcelas(r *http.Request, vendaID int) ([]parcelaResponse, error) {
	rows, err := h.pool.Query(r.Context(),
		`SELECT id, numero, valor, valor_pago, vencimento, status FROM parcelas WHERE venda_id = $1 ORDER BY numero`,
		vendaID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	parcelas := []parcelaResponse{}
	for rows.Next() {
		var p parcelaResponse
		var venc time.Time
		if err := rows.Scan(&p.ID, &p.Numero, &p.Valor, &p.ValorPago, &venc, &p.Status); err != nil {
			return nil, err
		}
		p.Vencimento = venc.Format("2006-01-02")
		parcelas = append(parcelas, p)
	}
	return parcelas, nil
}
