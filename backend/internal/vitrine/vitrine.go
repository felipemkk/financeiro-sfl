package vitrine

import (
	"encoding/json"
	"net/http"
	"strconv"

	"github.com/go-chi/chi/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

type Handler struct {
	pool *pgxpool.Pool
}

func NewHandler(pool *pgxpool.Pool) *Handler {
	return &Handler{pool: pool}
}

// PublicRoutes é montado fora do grupo autenticado.
func (h *Handler) PublicRoutes(r chi.Router) {
	r.Get("/produtos", h.listarPublico)
}

// AdminRoutes é montado dentro do grupo protegido por JWT.
func (h *Handler) AdminRoutes(r chi.Router) {
	r.Get("/produtos", h.listarAdmin)
	r.Post("/produtos", h.criar)
	r.Put("/produtos/{id}", h.atualizar)
	r.Post("/produtos/{id}/ativar", h.ativar)
	r.Post("/produtos/{id}/desativar", h.desativar)
	r.Delete("/produtos/{id}", h.excluir)
}

type produtoResponse struct {
	ID        int     `json:"id"`
	Categoria string  `json:"categoria"`
	Marca     string  `json:"marca"`
	Nome      string  `json:"nome"`
	Preco     float64 `json:"preco"`
	ImagemURL string  `json:"imagem_url"`
	Destaque  bool    `json:"destaque"`
	Ativo     bool    `json:"ativo"`
}

const camposSelect = `id, categoria, COALESCE(marca,''), nome, preco, imagem_url, destaque, ativo`

func escanear(row interface {
	Scan(dest ...interface{}) error
}) (produtoResponse, error) {
	var p produtoResponse
	err := row.Scan(&p.ID, &p.Categoria, &p.Marca, &p.Nome, &p.Preco, &p.ImagemURL, &p.Destaque, &p.Ativo)
	return p, err
}

func (h *Handler) listarPublico(w http.ResponseWriter, r *http.Request) {
	query := `SELECT ` + camposSelect + ` FROM vitrine_produtos WHERE ativo = true`
	args := []interface{}{}
	if categoria := r.URL.Query().Get("categoria"); categoria != "" {
		args = append(args, categoria)
		query += ` AND categoria = $` + strconv.Itoa(len(args))
	}
	if destaque := r.URL.Query().Get("destaque"); destaque == "true" {
		query += ` AND destaque = true`
	}
	query += ` ORDER BY criado_em DESC`

	rows, err := h.pool.Query(r.Context(), query, args...)
	if err != nil {
		http.Error(w, "erro ao buscar produtos", http.StatusInternalServerError)
		return
	}
	defer rows.Close()

	produtos := []produtoResponse{}
	for rows.Next() {
		p, err := escanear(rows)
		if err != nil {
			http.Error(w, "erro ao ler produtos", http.StatusInternalServerError)
			return
		}
		produtos = append(produtos, p)
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(produtos)
}

func (h *Handler) listarAdmin(w http.ResponseWriter, r *http.Request) {
	rows, err := h.pool.Query(r.Context(),
		`SELECT `+camposSelect+` FROM vitrine_produtos ORDER BY ativo DESC, criado_em DESC`)
	if err != nil {
		http.Error(w, "erro ao buscar produtos", http.StatusInternalServerError)
		return
	}
	defer rows.Close()

	produtos := []produtoResponse{}
	for rows.Next() {
		p, err := escanear(rows)
		if err != nil {
			http.Error(w, "erro ao ler produtos", http.StatusInternalServerError)
			return
		}
		produtos = append(produtos, p)
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(produtos)
}

type produtoRequest struct {
	Categoria string  `json:"categoria"`
	Marca     string  `json:"marca"`
	Nome      string  `json:"nome"`
	Preco     float64 `json:"preco"`
	ImagemURL string  `json:"imagem_url"`
	Destaque  bool    `json:"destaque"`
}

func (h *Handler) criar(w http.ResponseWriter, r *http.Request) {
	var req produtoRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "corpo inválido", http.StatusBadRequest)
		return
	}
	if req.Categoria == "" || req.Nome == "" || req.Preco <= 0 || req.ImagemURL == "" {
		http.Error(w, "dados obrigatórios: categoria, nome, preco, imagem_url", http.StatusBadRequest)
		return
	}

	var id int
	err := h.pool.QueryRow(r.Context(),
		`INSERT INTO vitrine_produtos (categoria, marca, nome, preco, imagem_url, destaque)
		 VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`,
		req.Categoria, req.Marca, req.Nome, req.Preco, req.ImagemURL, req.Destaque,
	).Scan(&id)
	if err != nil {
		http.Error(w, "erro ao criar produto", http.StatusInternalServerError)
		return
	}

	p, err := h.carregar(r, id)
	if err != nil {
		http.Error(w, "erro ao carregar produto criado", http.StatusInternalServerError)
		return
	}
	w.WriteHeader(http.StatusCreated)
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(p)
}

func (h *Handler) atualizar(w http.ResponseWriter, r *http.Request) {
	id, err := strconv.Atoi(chi.URLParam(r, "id"))
	if err != nil {
		http.Error(w, "id inválido", http.StatusBadRequest)
		return
	}

	var req produtoRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "corpo inválido", http.StatusBadRequest)
		return
	}
	if req.Categoria == "" || req.Nome == "" || req.Preco <= 0 || req.ImagemURL == "" {
		http.Error(w, "dados obrigatórios: categoria, nome, preco, imagem_url", http.StatusBadRequest)
		return
	}

	tag, err := h.pool.Exec(r.Context(),
		`UPDATE vitrine_produtos SET categoria = $1, marca = $2, nome = $3, preco = $4, imagem_url = $5, destaque = $6
		 WHERE id = $7`,
		req.Categoria, req.Marca, req.Nome, req.Preco, req.ImagemURL, req.Destaque, id)
	if err != nil {
		http.Error(w, "erro ao atualizar produto", http.StatusInternalServerError)
		return
	}
	if tag.RowsAffected() == 0 {
		http.Error(w, "produto não encontrado", http.StatusNotFound)
		return
	}

	p, err := h.carregar(r, id)
	if err != nil {
		http.Error(w, "erro ao carregar produto atualizado", http.StatusInternalServerError)
		return
	}
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(p)
}

func (h *Handler) ativar(w http.ResponseWriter, r *http.Request) {
	h.setAtivo(w, r, true)
}

func (h *Handler) desativar(w http.ResponseWriter, r *http.Request) {
	h.setAtivo(w, r, false)
}

func (h *Handler) setAtivo(w http.ResponseWriter, r *http.Request, ativo bool) {
	id, err := strconv.Atoi(chi.URLParam(r, "id"))
	if err != nil {
		http.Error(w, "id inválido", http.StatusBadRequest)
		return
	}

	tag, err := h.pool.Exec(r.Context(), `UPDATE vitrine_produtos SET ativo = $1 WHERE id = $2`, ativo, id)
	if err != nil {
		http.Error(w, "erro ao atualizar produto", http.StatusInternalServerError)
		return
	}
	if tag.RowsAffected() == 0 {
		http.Error(w, "produto não encontrado", http.StatusNotFound)
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

func (h *Handler) excluir(w http.ResponseWriter, r *http.Request) {
	id, err := strconv.Atoi(chi.URLParam(r, "id"))
	if err != nil {
		http.Error(w, "id inválido", http.StatusBadRequest)
		return
	}

	tag, err := h.pool.Exec(r.Context(), `DELETE FROM vitrine_produtos WHERE id = $1`, id)
	if err != nil {
		http.Error(w, "erro ao excluir produto", http.StatusInternalServerError)
		return
	}
	if tag.RowsAffected() == 0 {
		http.Error(w, "produto não encontrado", http.StatusNotFound)
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

func (h *Handler) carregar(r *http.Request, id int) (produtoResponse, error) {
	row := h.pool.QueryRow(r.Context(), `SELECT `+camposSelect+` FROM vitrine_produtos WHERE id = $1`, id)
	return escanear(row)
}
