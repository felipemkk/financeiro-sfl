package vitrine

import (
	"context"
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
	r.Get("/carrossel", h.listarCarrosselPublico)
}

// AdminRoutes é montado dentro do grupo protegido por JWT.
func (h *Handler) AdminRoutes(r chi.Router) {
	r.Get("/produtos", h.listarAdmin)
	r.Post("/produtos", h.criar)
	r.Put("/produtos/{id}", h.atualizar)
	r.Post("/produtos/{id}/ativar", h.ativar)
	r.Post("/produtos/{id}/desativar", h.desativar)
	r.Post("/produtos/{id}/capa-categoria", h.definirCapaCategoria)
	r.Delete("/produtos/{id}", h.excluir)
	r.Get("/carrossel", h.listarCarrosselAdmin)
	r.Post("/carrossel", h.adicionarCarrossel)
	r.Delete("/carrossel/{id}", h.excluirCarrossel)
}

type produtoResponse struct {
	ID            int     `json:"id"`
	Categoria     string  `json:"categoria"`
	Marca         string  `json:"marca"`
	Nome          string  `json:"nome"`
	Preco         float64 `json:"preco"`
	ImagemURL     string  `json:"imagem_url"`
	FotoExtra1    string  `json:"foto_extra_1"`
	FotoExtra2    string  `json:"foto_extra_2"`
	FotoExtra3    string  `json:"foto_extra_3"`
	FotoExtra4    string  `json:"foto_extra_4"`
	Destaque      bool    `json:"destaque"`
	CapaCategoria bool    `json:"capa_categoria"`
	Ativo         bool    `json:"ativo"`
}

const camposSelect = `id, categoria, COALESCE(marca,''), nome, preco, imagem_url,
	COALESCE(foto_extra_1,''), COALESCE(foto_extra_2,''), COALESCE(foto_extra_3,''), COALESCE(foto_extra_4,''),
	destaque, capa_categoria, ativo`

func escanear(row interface {
	Scan(dest ...interface{}) error
}) (produtoResponse, error) {
	var p produtoResponse
	err := row.Scan(&p.ID, &p.Categoria, &p.Marca, &p.Nome, &p.Preco, &p.ImagemURL,
		&p.FotoExtra1, &p.FotoExtra2, &p.FotoExtra3, &p.FotoExtra4, &p.Destaque, &p.CapaCategoria, &p.Ativo)
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
	if capa := r.URL.Query().Get("capa_categoria"); capa == "true" {
		query += ` AND capa_categoria = true`
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
	Categoria  string  `json:"categoria"`
	Marca      string  `json:"marca"`
	Nome       string  `json:"nome"`
	Preco      float64 `json:"preco"`
	ImagemURL  string  `json:"imagem_url"`
	FotoExtra1 string  `json:"foto_extra_1"`
	FotoExtra2 string  `json:"foto_extra_2"`
	FotoExtra3 string  `json:"foto_extra_3"`
	FotoExtra4 string  `json:"foto_extra_4"`
	Destaque   bool    `json:"destaque"`
}

func (h *Handler) criar(w http.ResponseWriter, r *http.Request) {
	var req produtoRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "corpo inválido", http.StatusBadRequest)
		return
	}
	if req.Categoria == "" || req.Marca == "" || req.ImagemURL == "" {
		http.Error(w, "dados obrigatórios: categoria, marca, imagem_url", http.StatusBadRequest)
		return
	}

	var id int
	err := h.pool.QueryRow(r.Context(),
		`INSERT INTO vitrine_produtos (categoria, marca, nome, preco, imagem_url, foto_extra_1, foto_extra_2, foto_extra_3, foto_extra_4, destaque)
		 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING id`,
		req.Categoria, req.Marca, req.Nome, req.Preco, req.ImagemURL,
		req.FotoExtra1, req.FotoExtra2, req.FotoExtra3, req.FotoExtra4, req.Destaque,
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
	if req.Categoria == "" || req.Marca == "" || req.ImagemURL == "" {
		http.Error(w, "dados obrigatórios: categoria, marca, imagem_url", http.StatusBadRequest)
		return
	}

	tag, err := h.pool.Exec(r.Context(),
		`UPDATE vitrine_produtos SET categoria = $1, marca = $2, nome = $3, preco = $4, imagem_url = $5,
		 foto_extra_1 = $6, foto_extra_2 = $7, foto_extra_3 = $8, foto_extra_4 = $9, destaque = $10
		 WHERE id = $11`,
		req.Categoria, req.Marca, req.Nome, req.Preco, req.ImagemURL,
		req.FotoExtra1, req.FotoExtra2, req.FotoExtra3, req.FotoExtra4, req.Destaque, id)
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

func (h *Handler) definirCapaCategoria(w http.ResponseWriter, r *http.Request) {
	id, err := strconv.Atoi(chi.URLParam(r, "id"))
	if err != nil {
		http.Error(w, "id inválido", http.StatusBadRequest)
		return
	}

	ctx := r.Context()

	tx, err := h.pool.Begin(ctx)
	if err != nil {
		http.Error(w, "erro ao definir capa", http.StatusInternalServerError)
		return
	}
	defer tx.Rollback(ctx)

	var categoria string
	if err := tx.QueryRow(ctx, `SELECT categoria FROM vitrine_produtos WHERE id = $1`, id).Scan(&categoria); err != nil {
		http.Error(w, "produto não encontrado", http.StatusNotFound)
		return
	}

	if _, err := tx.Exec(ctx,
		`UPDATE vitrine_produtos SET capa_categoria = false WHERE categoria = $1 AND capa_categoria = true`, categoria,
	); err != nil {
		http.Error(w, "erro ao definir capa", http.StatusInternalServerError)
		return
	}
	if _, err := tx.Exec(ctx, `UPDATE vitrine_produtos SET capa_categoria = true WHERE id = $1`, id); err != nil {
		http.Error(w, "erro ao definir capa", http.StatusInternalServerError)
		return
	}
	if err := tx.Commit(ctx); err != nil {
		http.Error(w, "erro ao definir capa", http.StatusInternalServerError)
		return
	}

	p, err := h.carregar(r, id)
	if err != nil {
		http.Error(w, "erro ao carregar produto", http.StatusInternalServerError)
		return
	}
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(p)
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

type imagemCarrossel struct {
	ID        int    `json:"id"`
	Escopo    string `json:"escopo"`
	ImagemURL string `json:"imagem_url"`
}

func (h *Handler) listarImagensCarrossel(ctx context.Context, escopo string) ([]imagemCarrossel, error) {
	rows, err := h.pool.Query(ctx,
		`SELECT id, escopo, imagem_url FROM vitrine_carrossel WHERE escopo = $1 ORDER BY id`, escopo)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	imagens := []imagemCarrossel{}
	for rows.Next() {
		var img imagemCarrossel
		if err := rows.Scan(&img.ID, &img.Escopo, &img.ImagemURL); err != nil {
			return nil, err
		}
		imagens = append(imagens, img)
	}
	return imagens, nil
}

func (h *Handler) listarCarrosselPublico(w http.ResponseWriter, r *http.Request) {
	escopo := r.URL.Query().Get("escopo")
	if escopo == "" {
		http.Error(w, "informe escopo", http.StatusBadRequest)
		return
	}
	imagens, err := h.listarImagensCarrossel(r.Context(), escopo)
	if err != nil {
		http.Error(w, "erro ao buscar carrossel", http.StatusInternalServerError)
		return
	}
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(imagens)
}

func (h *Handler) listarCarrosselAdmin(w http.ResponseWriter, r *http.Request) {
	escopo := r.URL.Query().Get("escopo")
	if escopo == "" {
		http.Error(w, "informe escopo", http.StatusBadRequest)
		return
	}
	imagens, err := h.listarImagensCarrossel(r.Context(), escopo)
	if err != nil {
		http.Error(w, "erro ao buscar carrossel", http.StatusInternalServerError)
		return
	}
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(imagens)
}

type carrosselRequest struct {
	Escopo    string `json:"escopo"`
	ImagemURL string `json:"imagem_url"`
}

func (h *Handler) adicionarCarrossel(w http.ResponseWriter, r *http.Request) {
	var req carrosselRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "corpo inválido", http.StatusBadRequest)
		return
	}
	if req.Escopo == "" || req.ImagemURL == "" {
		http.Error(w, "dados obrigatórios: escopo, imagem_url", http.StatusBadRequest)
		return
	}

	var img imagemCarrossel
	err := h.pool.QueryRow(r.Context(),
		`INSERT INTO vitrine_carrossel (escopo, imagem_url) VALUES ($1, $2) RETURNING id, escopo, imagem_url`,
		req.Escopo, req.ImagemURL,
	).Scan(&img.ID, &img.Escopo, &img.ImagemURL)
	if err != nil {
		http.Error(w, "erro ao adicionar imagem", http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusCreated)
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(img)
}

func (h *Handler) excluirCarrossel(w http.ResponseWriter, r *http.Request) {
	id, err := strconv.Atoi(chi.URLParam(r, "id"))
	if err != nil {
		http.Error(w, "id inválido", http.StatusBadRequest)
		return
	}

	tag, err := h.pool.Exec(r.Context(), `DELETE FROM vitrine_carrossel WHERE id = $1`, id)
	if err != nil {
		http.Error(w, "erro ao excluir imagem", http.StatusInternalServerError)
		return
	}
	if tag.RowsAffected() == 0 {
		http.Error(w, "imagem não encontrada", http.StatusNotFound)
		return
	}
	w.WriteHeader(http.StatusNoContent)
}
