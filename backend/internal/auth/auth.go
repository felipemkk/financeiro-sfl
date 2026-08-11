package auth

import (
	"context"
	"encoding/json"
	"net/http"
	"strings"
	"time"

	"github.com/golang-jwt/jwt/v5"
	"github.com/jackc/pgx/v5/pgxpool"
	"golang.org/x/crypto/bcrypt"
)

type contextKey string

const userIDKey contextKey = "userID"

type Service struct {
	pool      *pgxpool.Pool
	jwtSecret []byte
}

func NewService(pool *pgxpool.Pool, jwtSecret string) *Service {
	return &Service{pool: pool, jwtSecret: []byte(jwtSecret)}
}

type loginRequest struct {
	Email string `json:"email"`
	Senha string `json:"senha"`
}

type loginResponse struct {
	Token string `json:"token"`
}

func (s *Service) Login(w http.ResponseWriter, r *http.Request) {
	var req loginRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "corpo inválido", http.StatusBadRequest)
		return
	}

	var id int
	var senhaHash string
	err := s.pool.QueryRow(r.Context(),
		"SELECT id, senha_hash FROM usuarios WHERE email = $1", req.Email,
	).Scan(&id, &senhaHash)
	if err != nil {
		http.Error(w, "credenciais inválidas", http.StatusUnauthorized)
		return
	}

	if err := bcrypt.CompareHashAndPassword([]byte(senhaHash), []byte(req.Senha)); err != nil {
		http.Error(w, "credenciais inválidas", http.StatusUnauthorized)
		return
	}

	token, err := s.generateToken(id)
	if err != nil {
		http.Error(w, "erro ao gerar token", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(loginResponse{Token: token})
}

func (s *Service) generateToken(userID int) (string, error) {
	claims := jwt.MapClaims{
		"sub": userID,
		"exp": time.Now().Add(30 * 24 * time.Hour).Unix(),
	}
	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	return token.SignedString(s.jwtSecret)
}

// Middleware valida o JWT do header Authorization: Bearer <token>.
func (s *Service) Middleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		header := r.Header.Get("Authorization")
		parts := strings.SplitN(header, " ", 2)
		if len(parts) != 2 || parts[0] != "Bearer" {
			http.Error(w, "não autenticado", http.StatusUnauthorized)
			return
		}

		token, err := jwt.Parse(parts[1], func(t *jwt.Token) (interface{}, error) {
			return s.jwtSecret, nil
		})
		if err != nil || !token.Valid {
			http.Error(w, "token inválido", http.StatusUnauthorized)
			return
		}

		claims, ok := token.Claims.(jwt.MapClaims)
		if !ok {
			http.Error(w, "token inválido", http.StatusUnauthorized)
			return
		}
		sub, _ := claims["sub"].(float64)

		ctx := context.WithValue(r.Context(), userIDKey, int(sub))
		next.ServeHTTP(w, r.WithContext(ctx))
	})
}

// HashSenha é usado pelo script de seed de usuário (cmd/seed).
func HashSenha(senha string) (string, error) {
	hash, err := bcrypt.GenerateFromPassword([]byte(senha), bcrypt.DefaultCost)
	return string(hash), err
}
