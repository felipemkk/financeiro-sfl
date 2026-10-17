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
	CPF         string `json:"cpf"`
	Telefone    string `json:"telefone"`
	WhatsApp    string `json:"whatsapp"`
	Endereco    string `json:"endereco"`
	Observacoes string `json:"observacoes"`
	Ativo       bool   `json:"ativo"`
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
	r.Post("/{id}/desativar", h.desativar)
	r.Post("/{id}/ativar", h.ativar)
	r.Get("/pendentes", h.listarPendentes)
	r.Post("/pendentes/{id}/aprovar", h.aprovarPendente)
	r.Delete("/pendentes/{id}", h.descartarPendente)
}

// PublicRoutes é montado fora do grupo autenticado, para o formulário de
// autocadastro que a cliente preenche sozinha (link enviado por WhatsApp).
func (h *Handler) PublicRoutes(r chi.Router) {
	r.Post("/", h.criarPendente)
}

const camposSelect = `id, nome, COALESCE(cpf,''), COALESCE(telefone,''), COALESCE(whatsapp,''), COALESCE(endereco,''), COALESCE(observacoes,''), ativo`

// list retorna apenas clientes ativos por padrão. Use ?todos=true para
// incluir os desativados também.
func (h *Handler) list(w http.ResponseWriter, r *http.Request) {
	busca := r.URL.Query().Get("busca")
	todos := r.URL.Query().Get("todos") == "true"

	filtroAtivo := ""
	if !todos {
		filtroAtivo = "AND ativo = true"
	}

	var rows pgx.Rows
	var err error
	if busca != "" {
		rows, err = h.pool.Query(r.Context(),
			`SELECT `+camposSelect+`
			 FROM clientes WHERE nome ILIKE '%' || $1 || '%' `+filtroAtivo+` ORDER BY nome`, busca)
	} else {
		rows, err = h.pool.Query(r.Context(),
			`SELECT `+camposSelect+`
			 FROM clientes WHERE true `+filtroAtivo+` ORDER BY nome`)
	}
	if err != nil {
		http.Error(w, "erro ao buscar clientes", http.StatusInternalServerError)
		return
	}
	defer rows.Close()

	clientes := []Cliente{}
	for rows.Next() {
		var c Cliente
		if err := rows.Scan(&c.ID, &c.Nome, &c.CPF, &c.Telefone, &c.WhatsApp, &c.Endereco, &c.Observacoes, &c.Ativo); err != nil {
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
		`SELECT `+camposSelect+`
		 FROM clientes WHERE id = $1`, id,
	).Scan(&c.ID, &c.Nome, &c.CPF, &c.Telefone, &c.WhatsApp, &c.Endereco, &c.Observacoes, &c.Ativo)
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
		`INSERT INTO clientes (nome, cpf, telefone, whatsapp, endereco, observacoes)
		 VALUES ($1, $2, $3, $4, $5, $6) RETURNING id, ativo`,
		c.Nome, c.CPF, c.Telefone, c.WhatsApp, c.Endereco, c.Observacoes,
	).Scan(&c.ID, &c.Ativo)
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
		`UPDATE clientes SET nome = $1, cpf = $2, telefone = $3, whatsapp = $4, endereco = $5, observacoes = $6
		 WHERE id = $7`,
		c.Nome, c.CPF, c.Telefone, c.WhatsApp, c.Endereco, c.Observacoes, id,
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

func (h *Handler) desativar(w http.ResponseWriter, r *http.Request) {
	h.setAtivo(w, r, false)
}

func (h *Handler) ativar(w http.ResponseWriter, r *http.Request) {
	h.setAtivo(w, r, true)
}

func (h *Handler) setAtivo(w http.ResponseWriter, r *http.Request, ativo bool) {
	id, err := strconv.Atoi(chi.URLParam(r, "id"))
	if err != nil {
		http.Error(w, "id inválido", http.StatusBadRequest)
		return
	}

	tag, err := h.pool.Exec(r.Context(), `UPDATE clientes SET ativo = $1 WHERE id = $2`, ativo, id)
	if err != nil {
		http.Error(w, "erro ao atualizar cliente", http.StatusInternalServerError)
		return
	}
	if tag.RowsAffected() == 0 {
		http.Error(w, "cliente não encontrado", http.StatusNotFound)
		return
	}

	w.WriteHeader(http.StatusNoContent)
}

type ClientePendente struct {
	ID          int    `json:"id"`
	Nome        string `json:"nome"`
	CPF         string `json:"cpf"`
	Telefone    string `json:"telefone"`
	WhatsApp    string `json:"whatsapp"`
	Endereco    string `json:"endereco"`
	Observacoes string `json:"observacoes"`
}

const camposSelectPendente = `id, nome, COALESCE(cpf,''), COALESCE(telefone,''), COALESCE(whatsapp,''), COALESCE(endereco,''), COALESCE(observacoes,'')`

func (h *Handler) criarPendente(w http.ResponseWriter, r *http.Request) {
	var p ClientePendente
	if err := json.NewDecoder(r.Body).Decode(&p); err != nil {
		http.Error(w, "corpo inválido", http.StatusBadRequest)
		return
	}
	if p.Nome == "" {
		http.Error(w, "nome é obrigatório", http.StatusBadRequest)
		return
	}

	err := h.pool.QueryRow(r.Context(),
		`INSERT INTO clientes_pendentes (nome, cpf, telefone, whatsapp, endereco, observacoes)
		 VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`,
		p.Nome, p.CPF, p.Telefone, p.WhatsApp, p.Endereco, p.Observacoes,
	).Scan(&p.ID)
	if err != nil {
		http.Error(w, "erro ao enviar cadastro", http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusCreated)
	writeJSON(w, p)
}

func (h *Handler) listarPendentes(w http.ResponseWriter, r *http.Request) {
	rows, err := h.pool.Query(r.Context(),
		`SELECT `+camposSelectPendente+` FROM clientes_pendentes ORDER BY criado_em`)
	if err != nil {
		http.Error(w, "erro ao buscar cadastros pendentes", http.StatusInternalServerError)
		return
	}
	defer rows.Close()

	pendentes := []ClientePendente{}
	for rows.Next() {
		var p ClientePendente
		if err := rows.Scan(&p.ID, &p.Nome, &p.CPF, &p.Telefone, &p.WhatsApp, &p.Endereco, &p.Observacoes); err != nil {
			http.Error(w, "erro ao ler cadastros pendentes", http.StatusInternalServerError)
			return
		}
		pendentes = append(pendentes, p)
	}

	writeJSON(w, pendentes)
}

type aprovarPendenteRequest struct {
	ClienteID *int `json:"cliente_id"`
}

func (h *Handler) aprovarPendente(w http.ResponseWriter, r *http.Request) {
	id, err := strconv.Atoi(chi.URLParam(r, "id"))
	if err != nil {
		http.Error(w, "id inválido", http.StatusBadRequest)
		return
	}

	var req aprovarPendenteRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "corpo inválido", http.StatusBadRequest)
		return
	}

	var p ClientePendente
	err = h.pool.QueryRow(r.Context(),
		`SELECT `+camposSelectPendente+` FROM clientes_pendentes WHERE id = $1`, id,
	).Scan(&p.ID, &p.Nome, &p.CPF, &p.Telefone, &p.WhatsApp, &p.Endereco, &p.Observacoes)
	if err != nil {
		http.Error(w, "cadastro pendente não encontrado", http.StatusNotFound)
		return
	}

	var c Cliente
	if req.ClienteID == nil {
		err = h.pool.QueryRow(r.Context(),
			`INSERT INTO clientes (nome, cpf, telefone, whatsapp, endereco, observacoes)
			 VALUES ($1, $2, $3, $4, $5, $6) RETURNING `+camposSelect,
			p.Nome, p.CPF, p.Telefone, p.WhatsApp, p.Endereco, p.Observacoes,
		).Scan(&c.ID, &c.Nome, &c.CPF, &c.Telefone, &c.WhatsApp, &c.Endereco, &c.Observacoes, &c.Ativo)
	} else {
		// Preenche só os campos que a cliente existente ainda não tinha, sem
		// sobrescrever o que já estava cadastrado.
		err = h.pool.QueryRow(r.Context(),
			`UPDATE clientes SET
			   cpf = CASE WHEN COALESCE(cpf,'') = '' THEN $1 ELSE cpf END,
			   telefone = CASE WHEN COALESCE(telefone,'') = '' THEN $2 ELSE telefone END,
			   whatsapp = CASE WHEN COALESCE(whatsapp,'') = '' THEN $3 ELSE whatsapp END,
			   endereco = CASE WHEN COALESCE(endereco,'') = '' THEN $4 ELSE endereco END,
			   observacoes = CASE WHEN COALESCE(observacoes,'') = '' THEN $5 ELSE observacoes END
			 WHERE id = $6 RETURNING `+camposSelect,
			p.CPF, p.Telefone, p.WhatsApp, p.Endereco, p.Observacoes, *req.ClienteID,
		).Scan(&c.ID, &c.Nome, &c.CPF, &c.Telefone, &c.WhatsApp, &c.Endereco, &c.Observacoes, &c.Ativo)
	}
	if err != nil {
		http.Error(w, "erro ao aprovar cadastro", http.StatusInternalServerError)
		return
	}

	if _, err := h.pool.Exec(r.Context(), `DELETE FROM clientes_pendentes WHERE id = $1`, id); err != nil {
		http.Error(w, "erro ao limpar cadastro pendente", http.StatusInternalServerError)
		return
	}

	writeJSON(w, c)
}

func (h *Handler) descartarPendente(w http.ResponseWriter, r *http.Request) {
	id, err := strconv.Atoi(chi.URLParam(r, "id"))
	if err != nil {
		http.Error(w, "id inválido", http.StatusBadRequest)
		return
	}

	tag, err := h.pool.Exec(r.Context(), `DELETE FROM clientes_pendentes WHERE id = $1`, id)
	if err != nil {
		http.Error(w, "erro ao descartar cadastro", http.StatusInternalServerError)
		return
	}
	if tag.RowsAffected() == 0 {
		http.Error(w, "cadastro pendente não encontrado", http.StatusNotFound)
		return
	}

	w.WriteHeader(http.StatusNoContent)
}

func writeJSON(w http.ResponseWriter, v interface{}) {
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(v)
}
