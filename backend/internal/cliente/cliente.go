package cliente

import (
	"encoding/json"
	"net/http"
	"strconv"

	"github.com/go-chi/chi/v5"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

type Cliente struct {
	ID          int    `json:"id"`
	Nome        string `json:"nome"`
	Telefone    string `json:"telefone"`
	Observacoes string `json:"observacoes"`
}

type Handler struct {
	pool *pgxpool.Pool
}

func NewHandler(pool *pgxpool.Pool) *Handler {
	return &Handler{pool: pool}
}

func (h *Handler) Routes(r chi.Router) {
	r.Get("/", h.list)
	r.Post("/", h.create)
	r.Get("/{id}", h.get)
	r.Put("/{id}", h.update)
}

func (h *Handler) list(w http.ResponseWriter, r *http.Request) {
	busca := r.URL.Query().Get("busca")

	var rows pgx.Rows
	var err error
	if busca != "" {
		rows, err = h.pool.Query(r.Context(),
			`SELECT id, nome, COALESCE(telefone,''), COALESCE(observacoes,'')
			 FROM clientes WHERE nome ILIKE '%' || $1 || '%' ORDER BY nome`, busca)
	} else {
		rows, err = h.pool.Query(r.Context(),
			`SELECT id, nome, COALESCE(telefone,''), COALESCE(observacoes,'')
			 FROM clientes ORDER BY nome`)
	}
	if err != nil {
		http.Error(w, "erro ao buscar clientes", http.StatusInternalServerError)
		return
	}
	defer rows.Close()

	clientes := []Cliente{}
	for rows.Next() {
		var c Cliente
		if err := rows.Scan(&c.ID, &c.Nome, &c.Telefone, &c.Observacoes); err != nil {
			http.Error(w, "erro ao ler clientes", http.StatusInternalServerError)
			return
		}
		clientes = append(clientes, c)
	}

	writeJSON(w, clientes)
}

func (h *Handler) get(w http.ResponseWriter, r *http.Request) {
	id, err := strconv.Atoi(chi.URLParam(r, "id"))
	if err != nil {
		http.Error(w, "id inválido", http.StatusBadRequest)
		return
	}

	var c Cliente
	err = h.pool.QueryRow(r.Context(),
		`SELECT id, nome, COALESCE(telefone,''), COALESCE(observacoes,'')
		 FROM clientes WHERE id = $1`, id,
	).Scan(&c.ID, &c.Nome, &c.Telefone, &c.Observacoes)
	if err != nil {
		http.Error(w, "cliente não encontrado", http.StatusNotFound)
		return
	}

	writeJSON(w, c)
}

func (h *Handler) create(w http.ResponseWriter, r *http.Request) {
	var c Cliente
	if err := json.NewDecoder(r.Body).Decode(&c); err != nil {
		http.Error(w, "corpo inválido", http.StatusBadRequest)
		return
	}
	if c.Nome == "" {
		http.Error(w, "nome é obrigatório", http.StatusBadRequest)
		return
	}

	err := h.pool.QueryRow(r.Context(),
		`INSERT INTO clientes (nome, telefone, observacoes) VALUES ($1, $2, $3) RETURNING id`,
		c.Nome, c.Telefone, c.Observacoes,
	).Scan(&c.ID)
	if err != nil {
		http.Error(w, "erro ao criar cliente", http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusCreated)
	writeJSON(w, c)
}

func (h *Handler) update(w http.ResponseWriter, r *http.Request) {
	id, err := strconv.Atoi(chi.URLParam(r, "id"))
	if err != nil {
		http.Error(w, "id inválido", http.StatusBadRequest)
		return
	}

	var c Cliente
	if err := json.NewDecoder(r.Body).Decode(&c); err != nil {
		http.Error(w, "corpo inválido", http.StatusBadRequest)
		return
	}
	if c.Nome == "" {
		http.Error(w, "nome é obrigatório", http.StatusBadRequest)
		return
	}

	tag, err := h.pool.Exec(r.Context(),
		`UPDATE clientes SET nome = $1, telefone = $2, observacoes = $3 WHERE id = $4`,
		c.Nome, c.Telefone, c.Observacoes, id,
	)
	if err != nil {
		http.Error(w, "erro ao atualizar cliente", http.StatusInternalServerError)
		return
	}
	if tag.RowsAffected() == 0 {
		http.Error(w, "cliente não encontrado", http.StatusNotFound)
		return
	}

	c.ID = id
	writeJSON(w, c)
}

func writeJSON(w http.ResponseWriter, v interface{}) {
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(v)
}
