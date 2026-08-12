package casa

import (
	"context"
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
	r.Post("/lancamentos", h.criarLancamento)
	r.Get("/lancamentos", h.listarLancamentos)
	r.Get("/lancamentos/{id}", h.obterLancamento)
	r.Put("/lancamentos/{id}", h.atualizarLancamento)
	r.Post("/lancamentos/{id}/pagar", h.pagar)
	r.Post("/lancamentos/{id}/despagar", h.despagar)
	r.Delete("/lancamentos/{id}", h.excluirLancamento)
	r.Get("/recorrentes", h.listarRecorrentes)
	r.Post("/recorrentes/{id}/desativar", h.desativarRecorrente)
	r.Post("/recorrentes/{id}/ativar", h.ativarRecorrente)
	r.Get("/categorias", h.listarCategorias)
	r.Get("/resumo", h.resumo)
}

type lancamentoResponse struct {
	ID               int     `json:"id"`
	Tipo             string  `json:"tipo"`
	RecorrenteID     *int    `json:"recorrente_id"`
	TipoRecorrencia  string  `json:"tipo_recorrencia"`
	Categoria        string  `json:"categoria"`
	Descricao        string  `json:"descricao"`
	ValorPrevisto    float64 `json:"valor_previsto"`
	ValorRealizado   float64 `json:"valor_realizado"`
	DataVencimento   *string `json:"data_vencimento"`
	Status           string  `json:"status"` // pendente | paga | atrasada
	Observacoes      string  `json:"observacoes"`
	CompetenciaAno   int     `json:"competencia_ano"`
	CompetenciaMes   int     `json:"competencia_mes"`
	NumeroParcela    *int    `json:"numero_parcela"`
	NumParcelasTotal *int    `json:"num_parcelas_total"`
}

func ultimoDiaDoMes(ano int, mes time.Month) int {
	return time.Date(ano, mes+1, 0, 0, 0, 0, 0, time.UTC).Day()
}

func construirData(ano, mes, dia int) time.Time {
	ultimo := ultimoDiaDoMes(ano, time.Month(mes))
	if dia > ultimo {
		dia = ultimo
	}
	if dia < 1 {
		dia = 1
	}
	return time.Date(ano, time.Month(mes), dia, 0, 0, 0, 0, time.UTC)
}

type criarRequest struct {
	Tipo            string  `json:"tipo"`
	TipoRecorrencia string  `json:"tipo_recorrencia"` // "fixa" | "variavel" | "parcelada" | "" (pontual)
	Categoria       string  `json:"categoria"`
	Descricao       string  `json:"descricao"`
	ValorPrevisto   float64 `json:"valor_previsto"`  // para "parcelada": valor de cada parcela
	DataVencimento  string  `json:"data_vencimento"` // YYYY-MM-DD, opcional (obrigatório para "parcelada")
	Observacoes     string  `json:"observacoes"`
	CompetenciaAno  int     `json:"competencia_ano"`
	CompetenciaMes  int     `json:"competencia_mes"`
	NumParcelas     int     `json:"num_parcelas"` // obrigatório para "parcelada"
}

func (h *Handler) criarLancamento(w http.ResponseWriter, r *http.Request) {
	var req criarRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "corpo inválido", http.StatusBadRequest)
		return
	}

	if req.Tipo != "despesa" && req.Tipo != "receita" {
		http.Error(w, "tipo deve ser 'despesa' ou 'receita'", http.StatusBadRequest)
		return
	}
	if req.Categoria == "" || req.Descricao == "" || req.ValorPrevisto <= 0 {
		http.Error(w, "dados obrigatórios: categoria, descricao, valor_previsto", http.StatusBadRequest)
		return
	}
	if req.TipoRecorrencia != "parcelada" && (req.CompetenciaMes < 1 || req.CompetenciaMes > 12 || req.CompetenciaAno < 2000) {
		http.Error(w, "competencia_ano/competencia_mes inválidos", http.StatusBadRequest)
		return
	}

	var dataVenc *time.Time
	var diaVenc *int
	if req.DataVencimento != "" {
		d, err := time.Parse("2006-01-02", req.DataVencimento)
		if err != nil {
			http.Error(w, "data_vencimento deve estar no formato YYYY-MM-DD", http.StatusBadRequest)
			return
		}
		dataVenc = &d
		dia := d.Day()
		diaVenc = &dia
	}

	ctx := r.Context()

	if req.TipoRecorrencia == "parcelada" {
		if dataVenc == nil {
			http.Error(w, "data_vencimento é obrigatório para despesas parceladas", http.StatusBadRequest)
			return
		}
		if req.NumParcelas < 1 {
			http.Error(w, "num_parcelas deve ser maior que zero para despesas parceladas", http.StatusBadRequest)
			return
		}

		tx, err := h.pool.Begin(ctx)
		if err != nil {
			http.Error(w, "erro ao iniciar transação", http.StatusInternalServerError)
			return
		}
		defer tx.Rollback(ctx)

		var recorrenteID int
		err = tx.QueryRow(ctx,
			`INSERT INTO casa_recorrentes (tipo, categoria, descricao, tipo_recorrencia, valor_base, dia_vencimento, num_parcelas, ativa)
			 VALUES ($1, $2, $3, 'parcelada', $4, $5, $6, true) RETURNING id`,
			req.Tipo, req.Categoria, req.Descricao, req.ValorPrevisto, diaVenc, req.NumParcelas,
		).Scan(&recorrenteID)
		if err != nil {
			http.Error(w, "erro ao criar parcelamento", http.StatusInternalServerError)
			return
		}

		var primeiroLancamentoID int
		dataAtual := *dataVenc
		for i := 1; i <= req.NumParcelas; i++ {
			anoAtual := dataAtual.Year()
			mesAtual := int(dataAtual.Month())
			var lancamentoID int
			err = tx.QueryRow(ctx,
				`INSERT INTO casa_lancamentos (tipo, recorrente_id, categoria, descricao, valor_previsto, data_vencimento, observacoes, competencia_ano, competencia_mes, numero_parcela)
				 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING id`,
				req.Tipo, recorrenteID, req.Categoria, req.Descricao, req.ValorPrevisto, dataAtual, req.Observacoes, anoAtual, mesAtual, i,
			).Scan(&lancamentoID)
			if err != nil {
				http.Error(w, "erro ao criar parcelas", http.StatusInternalServerError)
				return
			}
			if i == 1 {
				primeiroLancamentoID = lancamentoID
			}
			dataAtual = construirData(anoAtual, mesAtual+1, dataVenc.Day())
		}

		if err := tx.Commit(ctx); err != nil {
			http.Error(w, "erro ao confirmar transação", http.StatusInternalServerError)
			return
		}

		l, err := h.carregarLancamento(ctx, primeiroLancamentoID)
		if err != nil {
			http.Error(w, "erro ao carregar lançamento criado", http.StatusInternalServerError)
			return
		}
		w.WriteHeader(http.StatusCreated)
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(l)
		return
	}

	if req.TipoRecorrencia == "fixa" || req.TipoRecorrencia == "variavel" {
		tx, err := h.pool.Begin(ctx)
		if err != nil {
			http.Error(w, "erro ao iniciar transação", http.StatusInternalServerError)
			return
		}
		defer tx.Rollback(ctx)

		var recorrenteID int
		err = tx.QueryRow(ctx,
			`INSERT INTO casa_recorrentes (tipo, categoria, descricao, tipo_recorrencia, valor_base, dia_vencimento, ativa)
			 VALUES ($1, $2, $3, $4, $5, $6, true) RETURNING id`,
			req.Tipo, req.Categoria, req.Descricao, req.TipoRecorrencia, req.ValorPrevisto, diaVenc,
		).Scan(&recorrenteID)
		if err != nil {
			http.Error(w, "erro ao criar recorrência", http.StatusInternalServerError)
			return
		}

		var lancamentoID int
		err = tx.QueryRow(ctx,
			`INSERT INTO casa_lancamentos (tipo, recorrente_id, categoria, descricao, valor_previsto, data_vencimento, observacoes, competencia_ano, competencia_mes)
			 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING id`,
			req.Tipo, recorrenteID, req.Categoria, req.Descricao, req.ValorPrevisto, dataVenc, req.Observacoes, req.CompetenciaAno, req.CompetenciaMes,
		).Scan(&lancamentoID)
		if err != nil {
			http.Error(w, "erro ao criar lançamento", http.StatusInternalServerError)
			return
		}

		if err := tx.Commit(ctx); err != nil {
			http.Error(w, "erro ao confirmar transação", http.StatusInternalServerError)
			return
		}

		l, err := h.carregarLancamento(ctx, lancamentoID)
		if err != nil {
			http.Error(w, "erro ao carregar lançamento criado", http.StatusInternalServerError)
			return
		}
		w.WriteHeader(http.StatusCreated)
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(l)
		return
	}

	var lancamentoID int
	err := h.pool.QueryRow(ctx,
		`INSERT INTO casa_lancamentos (tipo, categoria, descricao, valor_previsto, data_vencimento, observacoes, competencia_ano, competencia_mes)
		 VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING id`,
		req.Tipo, req.Categoria, req.Descricao, req.ValorPrevisto, dataVenc, req.Observacoes, req.CompetenciaAno, req.CompetenciaMes,
	).Scan(&lancamentoID)
	if err != nil {
		http.Error(w, "erro ao criar lançamento", http.StatusInternalServerError)
		return
	}

	l, err := h.carregarLancamento(ctx, lancamentoID)
	if err != nil {
		http.Error(w, "erro ao carregar lançamento criado", http.StatusInternalServerError)
		return
	}
	w.WriteHeader(http.StatusCreated)
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(l)
}

// gerarInstanciasRecorrentes garante que toda casa_recorrentes ativa tem um
// casa_lancamentos para a competência informada, criando o que faltar.
func (h *Handler) gerarInstanciasRecorrentes(ctx context.Context, ano, mes int) error {
	rows, err := h.pool.Query(ctx, `
		SELECT cr.id, cr.tipo, cr.categoria, cr.descricao, cr.valor_base, cr.dia_vencimento
		FROM casa_recorrentes cr
		WHERE cr.ativa = true
		AND cr.tipo_recorrencia <> 'parcelada'
		AND NOT EXISTS (
			SELECT 1 FROM casa_lancamentos cl
			WHERE cl.recorrente_id = cr.id AND cl.competencia_ano = $1 AND cl.competencia_mes = $2
		)`, ano, mes)
	if err != nil {
		return err
	}

	type pendente struct {
		id        int
		tipo      string
		categoria string
		descricao string
		valorBase float64
		diaVenc   *int
	}
	var faltantes []pendente
	for rows.Next() {
		var p pendente
		if err := rows.Scan(&p.id, &p.tipo, &p.categoria, &p.descricao, &p.valorBase, &p.diaVenc); err != nil {
			rows.Close()
			return err
		}
		faltantes = append(faltantes, p)
	}
	rows.Close()

	for _, p := range faltantes {
		var dataVenc *time.Time
		if p.diaVenc != nil {
			d := construirData(ano, mes, *p.diaVenc)
			dataVenc = &d
		}
		_, err := h.pool.Exec(ctx,
			`INSERT INTO casa_lancamentos (tipo, recorrente_id, categoria, descricao, valor_previsto, data_vencimento, competencia_ano, competencia_mes)
			 VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
			p.tipo, p.id, p.categoria, p.descricao, p.valorBase, dataVenc, ano, mes,
		)
		if err != nil {
			return err
		}
	}
	return nil
}

func (h *Handler) listarLancamentos(w http.ResponseWriter, r *http.Request) {
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
	tipoFiltro := r.URL.Query().Get("tipo")

	ctx := r.Context()
	if err := h.gerarInstanciasRecorrentes(ctx, ano, mes); err != nil {
		http.Error(w, "erro ao gerar recorrências", http.StatusInternalServerError)
		return
	}

	query := `
		SELECT cl.id, cl.tipo, cl.recorrente_id, COALESCE(cr.tipo_recorrencia, 'pontual'),
		       cl.categoria, cl.descricao, cl.valor_previsto, cl.valor_realizado,
		       cl.data_vencimento, cl.status, COALESCE(cl.observacoes, ''), cl.competencia_ano, cl.competencia_mes,
		       cl.numero_parcela, cr.num_parcelas
		FROM casa_lancamentos cl
		LEFT JOIN casa_recorrentes cr ON cr.id = cl.recorrente_id
		WHERE cl.competencia_ano = $1 AND cl.competencia_mes = $2`
	args := []interface{}{ano, mes}
	if tipoFiltro == "despesa" || tipoFiltro == "receita" {
		query += " AND cl.tipo = $3"
		args = append(args, tipoFiltro)
	}
	query += " ORDER BY cl.data_vencimento NULLS LAST, cl.categoria"

	rows, err := h.pool.Query(ctx, query, args...)
	if err != nil {
		http.Error(w, "erro ao buscar lançamentos", http.StatusInternalServerError)
		return
	}
	defer rows.Close()

	resultado := []lancamentoResponse{}
	hoje := time.Now().Truncate(24 * time.Hour)
	for rows.Next() {
		l, err := escanearLancamento(rows, hoje)
		if err != nil {
			http.Error(w, "erro ao ler lançamentos", http.StatusInternalServerError)
			return
		}
		resultado = append(resultado, l)
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(resultado)
}

type linhaScanner interface {
	Scan(dest ...interface{}) error
}

func escanearLancamento(row linhaScanner, hoje time.Time) (lancamentoResponse, error) {
	var l lancamentoResponse
	var venc *time.Time
	if err := row.Scan(&l.ID, &l.Tipo, &l.RecorrenteID, &l.TipoRecorrencia,
		&l.Categoria, &l.Descricao, &l.ValorPrevisto, &l.ValorRealizado,
		&venc, &l.Status, &l.Observacoes, &l.CompetenciaAno, &l.CompetenciaMes,
		&l.NumeroParcela, &l.NumParcelasTotal); err != nil {
		return lancamentoResponse{}, err
	}
	if venc != nil {
		s := venc.Format("2006-01-02")
		l.DataVencimento = &s
		if l.Status == "pendente" && venc.Before(hoje) {
			l.Status = "atrasada"
		}
	}
	return l, nil
}

func (h *Handler) carregarLancamento(ctx context.Context, id int) (lancamentoResponse, error) {
	row := h.pool.QueryRow(ctx, `
		SELECT cl.id, cl.tipo, cl.recorrente_id, COALESCE(cr.tipo_recorrencia, 'pontual'),
		       cl.categoria, cl.descricao, cl.valor_previsto, cl.valor_realizado,
		       cl.data_vencimento, cl.status, COALESCE(cl.observacoes, ''), cl.competencia_ano, cl.competencia_mes,
		       cl.numero_parcela, cr.num_parcelas
		FROM casa_lancamentos cl
		LEFT JOIN casa_recorrentes cr ON cr.id = cl.recorrente_id
		WHERE cl.id = $1`, id)
	return escanearLancamento(row, time.Now().Truncate(24*time.Hour))
}

func (h *Handler) obterLancamento(w http.ResponseWriter, r *http.Request) {
	id, err := strconv.Atoi(chi.URLParam(r, "id"))
	if err != nil {
		http.Error(w, "id inválido", http.StatusBadRequest)
		return
	}

	l, err := h.carregarLancamento(r.Context(), id)
	if err != nil {
		http.Error(w, "lançamento não encontrado", http.StatusNotFound)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(l)
}

type atualizarRequest struct {
	Categoria      string  `json:"categoria"`
	Descricao      string  `json:"descricao"`
	ValorPrevisto  float64 `json:"valor_previsto"`
	DataVencimento string  `json:"data_vencimento"`
	Observacoes    string  `json:"observacoes"`
}

func (h *Handler) atualizarLancamento(w http.ResponseWriter, r *http.Request) {
	id, err := strconv.Atoi(chi.URLParam(r, "id"))
	if err != nil {
		http.Error(w, "id inválido", http.StatusBadRequest)
		return
	}

	var req atualizarRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "corpo inválido", http.StatusBadRequest)
		return
	}
	if req.Categoria == "" || req.Descricao == "" || req.ValorPrevisto <= 0 {
		http.Error(w, "dados obrigatórios: categoria, descricao, valor_previsto", http.StatusBadRequest)
		return
	}

	var dataVenc *time.Time
	if req.DataVencimento != "" {
		d, err := time.Parse("2006-01-02", req.DataVencimento)
		if err != nil {
			http.Error(w, "data_vencimento deve estar no formato YYYY-MM-DD", http.StatusBadRequest)
			return
		}
		dataVenc = &d
	}

	ctx := r.Context()
	tag, err := h.pool.Exec(ctx,
		`UPDATE casa_lancamentos SET categoria = $1, descricao = $2, valor_previsto = $3, data_vencimento = $4, observacoes = $5
		 WHERE id = $6`,
		req.Categoria, req.Descricao, req.ValorPrevisto, dataVenc, req.Observacoes, id)
	if err != nil {
		http.Error(w, "erro ao atualizar lançamento", http.StatusInternalServerError)
		return
	}
	if tag.RowsAffected() == 0 {
		http.Error(w, "lançamento não encontrado", http.StatusNotFound)
		return
	}

	l, err := h.carregarLancamento(ctx, id)
	if err != nil {
		http.Error(w, "erro ao carregar lançamento atualizado", http.StatusInternalServerError)
		return
	}
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(l)
}

type pagarRequest struct {
	ValorRealizado *float64 `json:"valor_realizado"`
}

func (h *Handler) pagar(w http.ResponseWriter, r *http.Request) {
	id, err := strconv.Atoi(chi.URLParam(r, "id"))
	if err != nil {
		http.Error(w, "id inválido", http.StatusBadRequest)
		return
	}

	var req pagarRequest
	_ = json.NewDecoder(r.Body).Decode(&req)

	ctx := r.Context()
	var rowsAffected int64
	if req.ValorRealizado != nil {
		tag, execErr := h.pool.Exec(ctx,
			`UPDATE casa_lancamentos SET status = 'paga', valor_realizado = $1, data_pagamento = now() WHERE id = $2`,
			*req.ValorRealizado, id)
		err = execErr
		rowsAffected = tag.RowsAffected()
	} else {
		tag, execErr := h.pool.Exec(ctx,
			`UPDATE casa_lancamentos SET status = 'paga', valor_realizado = valor_previsto, data_pagamento = now() WHERE id = $1`,
			id)
		err = execErr
		rowsAffected = tag.RowsAffected()
	}
	if err != nil {
		http.Error(w, "erro ao marcar lançamento como pago", http.StatusInternalServerError)
		return
	}
	if rowsAffected == 0 {
		http.Error(w, "lançamento não encontrado", http.StatusNotFound)
		return
	}

	l, err := h.carregarLancamento(ctx, id)
	if err != nil {
		http.Error(w, "erro ao carregar lançamento atualizado", http.StatusInternalServerError)
		return
	}
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(l)
}

func (h *Handler) despagar(w http.ResponseWriter, r *http.Request) {
	id, err := strconv.Atoi(chi.URLParam(r, "id"))
	if err != nil {
		http.Error(w, "id inválido", http.StatusBadRequest)
		return
	}

	tag, err := h.pool.Exec(r.Context(),
		`UPDATE casa_lancamentos SET status = 'pendente', valor_realizado = 0, data_pagamento = NULL WHERE id = $1`, id)
	if err != nil {
		http.Error(w, "erro ao despagar lançamento", http.StatusInternalServerError)
		return
	}
	if tag.RowsAffected() == 0 {
		http.Error(w, "lançamento não encontrado", http.StatusNotFound)
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

func (h *Handler) excluirLancamento(w http.ResponseWriter, r *http.Request) {
	id, err := strconv.Atoi(chi.URLParam(r, "id"))
	if err != nil {
		http.Error(w, "id inválido", http.StatusBadRequest)
		return
	}

	tag, err := h.pool.Exec(r.Context(), `DELETE FROM casa_lancamentos WHERE id = $1`, id)
	if err != nil {
		http.Error(w, "erro ao excluir lançamento", http.StatusInternalServerError)
		return
	}
	if tag.RowsAffected() == 0 {
		http.Error(w, "lançamento não encontrado", http.StatusNotFound)
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

type recorrenteResponse struct {
	ID              int     `json:"id"`
	Tipo            string  `json:"tipo"`
	Categoria       string  `json:"categoria"`
	Descricao       string  `json:"descricao"`
	TipoRecorrencia string  `json:"tipo_recorrencia"`
	ValorBase       float64 `json:"valor_base"`
	DiaVencimento   *int    `json:"dia_vencimento"`
	Ativa           bool    `json:"ativa"`
}

func (h *Handler) listarRecorrentes(w http.ResponseWriter, r *http.Request) {
	rows, err := h.pool.Query(r.Context(), `
		SELECT id, tipo, categoria, descricao, tipo_recorrencia, valor_base, dia_vencimento, ativa
		FROM casa_recorrentes ORDER BY ativa DESC, categoria`)
	if err != nil {
		http.Error(w, "erro ao buscar recorrências", http.StatusInternalServerError)
		return
	}
	defer rows.Close()

	resultado := []recorrenteResponse{}
	for rows.Next() {
		var rr recorrenteResponse
		if err := rows.Scan(&rr.ID, &rr.Tipo, &rr.Categoria, &rr.Descricao, &rr.TipoRecorrencia, &rr.ValorBase, &rr.DiaVencimento, &rr.Ativa); err != nil {
			http.Error(w, "erro ao ler recorrências", http.StatusInternalServerError)
			return
		}
		resultado = append(resultado, rr)
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(resultado)
}

func (h *Handler) desativarRecorrente(w http.ResponseWriter, r *http.Request) {
	h.setAtivaRecorrente(w, r, false)
}

func (h *Handler) ativarRecorrente(w http.ResponseWriter, r *http.Request) {
	h.setAtivaRecorrente(w, r, true)
}

func (h *Handler) setAtivaRecorrente(w http.ResponseWriter, r *http.Request, ativa bool) {
	id, err := strconv.Atoi(chi.URLParam(r, "id"))
	if err != nil {
		http.Error(w, "id inválido", http.StatusBadRequest)
		return
	}

	tag, err := h.pool.Exec(r.Context(), `UPDATE casa_recorrentes SET ativa = $1 WHERE id = $2`, ativa, id)
	if err != nil {
		http.Error(w, "erro ao atualizar recorrência", http.StatusInternalServerError)
		return
	}
	if tag.RowsAffected() == 0 {
		http.Error(w, "recorrência não encontrada", http.StatusNotFound)
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

func (h *Handler) listarCategorias(w http.ResponseWriter, r *http.Request) {
	rows, err := h.pool.Query(r.Context(), `SELECT DISTINCT categoria FROM casa_lancamentos ORDER BY categoria`)
	if err != nil {
		http.Error(w, "erro ao buscar categorias", http.StatusInternalServerError)
		return
	}
	defer rows.Close()

	categorias := []string{}
	for rows.Next() {
		var c string
		if err := rows.Scan(&c); err != nil {
			http.Error(w, "erro ao ler categorias", http.StatusInternalServerError)
			return
		}
		categorias = append(categorias, c)
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(categorias)
}

type categoriaResumo struct {
	Categoria  string  `json:"categoria"`
	Previsto   float64 `json:"previsto"`
	Realizado  float64 `json:"realizado"`
	Percentual float64 `json:"percentual"`
}

type resumoResponse struct {
	ReceitasPrevisto  float64           `json:"receitas_previsto"`
	ReceitasRealizado float64           `json:"receitas_realizado"`
	DespesasPrevisto  float64           `json:"despesas_previsto"`
	DespesasRealizado float64           `json:"despesas_realizado"`
	SaldoPrevisto     float64           `json:"saldo_previsto"`
	SaldoRealizado    float64           `json:"saldo_realizado"`
	PorCategoria      []categoriaResumo `json:"por_categoria"`
}

func (h *Handler) resumo(w http.ResponseWriter, r *http.Request) {
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

	ctx := r.Context()
	if err := h.gerarInstanciasRecorrentes(ctx, ano, mes); err != nil {
		http.Error(w, "erro ao gerar recorrências", http.StatusInternalServerError)
		return
	}

	var resp resumoResponse
	err := h.pool.QueryRow(ctx, `
		SELECT COALESCE(SUM(valor_previsto), 0), COALESCE(SUM(valor_realizado), 0)
		FROM casa_lancamentos WHERE tipo = 'receita' AND competencia_ano = $1 AND competencia_mes = $2`,
		ano, mes,
	).Scan(&resp.ReceitasPrevisto, &resp.ReceitasRealizado)
	if err != nil {
		http.Error(w, "erro ao calcular receitas", http.StatusInternalServerError)
		return
	}

	err = h.pool.QueryRow(ctx, `
		SELECT COALESCE(SUM(valor_previsto), 0), COALESCE(SUM(valor_realizado), 0)
		FROM casa_lancamentos WHERE tipo = 'despesa' AND competencia_ano = $1 AND competencia_mes = $2`,
		ano, mes,
	).Scan(&resp.DespesasPrevisto, &resp.DespesasRealizado)
	if err != nil {
		http.Error(w, "erro ao calcular despesas", http.StatusInternalServerError)
		return
	}

	resp.SaldoPrevisto = resp.ReceitasPrevisto - resp.DespesasPrevisto
	resp.SaldoRealizado = resp.ReceitasRealizado - resp.DespesasRealizado

	rows, err := h.pool.Query(ctx, `
		SELECT categoria, COALESCE(SUM(valor_previsto), 0), COALESCE(SUM(valor_realizado), 0)
		FROM casa_lancamentos
		WHERE tipo = 'despesa' AND competencia_ano = $1 AND competencia_mes = $2
		GROUP BY categoria ORDER BY SUM(valor_previsto) DESC`, ano, mes)
	if err != nil {
		http.Error(w, "erro ao calcular despesas por categoria", http.StatusInternalServerError)
		return
	}
	defer rows.Close()

	resp.PorCategoria = []categoriaResumo{}
	for rows.Next() {
		var c categoriaResumo
		if err := rows.Scan(&c.Categoria, &c.Previsto, &c.Realizado); err != nil {
			http.Error(w, "erro ao ler despesas por categoria", http.StatusInternalServerError)
			return
		}
		if resp.DespesasPrevisto > 0 {
			c.Percentual = c.Previsto / resp.DespesasPrevisto * 100
		}
		resp.PorCategoria = append(resp.PorCategoria, c)
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(resp)
}
