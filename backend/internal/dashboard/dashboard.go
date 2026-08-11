package dashboard

import (
	"encoding/json"
	"net/http"
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
	r.Get("/", h.get)
}

type resposta struct {
	AtrasadosQtd   int     `json:"atrasados_qtd"`
	AtrasadosTotal float64 `json:"atrasados_total"`
	HojeQtd        int     `json:"hoje_qtd"`
	HojeTotal      float64 `json:"hoje_total"`
	ClientesTotal  int     `json:"clientes_total"`
	VendasMesQtd   int     `json:"vendas_mes_qtd"`
	VendasMesTotal float64 `json:"vendas_mes_total"`
}

func (h *Handler) get(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	hoje := time.Now().Truncate(24 * time.Hour)
	inicioMes := time.Date(hoje.Year(), hoje.Month(), 1, 0, 0, 0, 0, time.UTC)
	fimMes := inicioMes.AddDate(0, 1, 0)

	var resp resposta

	err := h.pool.QueryRow(ctx, `
		SELECT COUNT(*), COALESCE(SUM(valor - valor_pago), 0)
		FROM parcelas WHERE status = 'pendente' AND vencimento < $1`, hoje,
	).Scan(&resp.AtrasadosQtd, &resp.AtrasadosTotal)
	if err != nil {
		http.Error(w, "erro ao buscar parcelas atrasadas", http.StatusInternalServerError)
		return
	}

	err = h.pool.QueryRow(ctx, `
		SELECT COUNT(*), COALESCE(SUM(valor - valor_pago), 0)
		FROM parcelas WHERE status = 'pendente' AND vencimento = $1`, hoje,
	).Scan(&resp.HojeQtd, &resp.HojeTotal)
	if err != nil {
		http.Error(w, "erro ao buscar parcelas do dia", http.StatusInternalServerError)
		return
	}

	err = h.pool.QueryRow(ctx, `SELECT COUNT(*) FROM clientes`).Scan(&resp.ClientesTotal)
	if err != nil {
		http.Error(w, "erro ao contar clientes", http.StatusInternalServerError)
		return
	}

	err = h.pool.QueryRow(ctx, `
		SELECT COUNT(*), COALESCE(SUM(valor_total), 0)
		FROM vendas WHERE criada_em >= $1 AND criada_em < $2`, inicioMes, fimMes,
	).Scan(&resp.VendasMesQtd, &resp.VendasMesTotal)
	if err != nil {
		http.Error(w, "erro ao buscar vendas do mês", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(resp)
}
