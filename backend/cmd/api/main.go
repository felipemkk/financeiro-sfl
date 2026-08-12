package main

import (
	"context"
	"log"
	"net/http"
	"os"

	"github.com/go-chi/chi/v5"
	"github.com/go-chi/chi/v5/middleware"
	"github.com/go-chi/cors"
	"github.com/joho/godotenv"

	"financeiro-sfl/backend/internal/auth"
	"financeiro-sfl/backend/internal/casa"
	"financeiro-sfl/backend/internal/cliente"
	"financeiro-sfl/backend/internal/dashboard"
	"financeiro-sfl/backend/internal/db"
	"financeiro-sfl/backend/internal/parcela"
	"financeiro-sfl/backend/internal/venda"
	"financeiro-sfl/backend/internal/vitrine"
)

func main() {
	_ = godotenv.Load()

	connString := os.Getenv("DATABASE_URL")
	if connString == "" {
		connString = "postgres://lojafiado:lojafiado@localhost:5432/lojafiado"
	}
	jwtSecret := os.Getenv("JWT_SECRET")
	if jwtSecret == "" {
		jwtSecret = "dev-secret-troque-em-producao"
	}
	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}
	frontendOrigin := os.Getenv("FRONTEND_ORIGIN")
	if frontendOrigin == "" {
		frontendOrigin = "http://localhost:4200"
	}

	ctx := context.Background()
	pool, err := db.Connect(ctx, connString)
	if err != nil {
		log.Fatalf("erro ao conectar ao banco: %v", err)
	}
	defer pool.Close()

	if err := db.Migrate(ctx, pool); err != nil {
		log.Fatalf("erro ao rodar migrations: %v", err)
	}

	authService := auth.NewService(pool, jwtSecret)
	clienteHandler := cliente.NewHandler(pool)
	vendaHandler := venda.NewHandler(pool)
	parcelaHandler := parcela.NewHandler(pool)
	dashboardHandler := dashboard.NewHandler(pool)
	casaHandler := casa.NewHandler(pool)
	vitrineHandler := vitrine.NewHandler(pool)

	r := chi.NewRouter()
	r.Use(middleware.Logger)
	r.Use(middleware.Recoverer)
	r.Use(cors.Handler(cors.Options{
		AllowedOrigins:   []string{frontendOrigin},
		AllowedMethods:   []string{"GET", "POST", "PUT", "DELETE", "OPTIONS"},
		AllowedHeaders:   []string{"Authorization", "Content-Type"},
		AllowCredentials: true,
	}))

	r.Get("/health", func(w http.ResponseWriter, r *http.Request) {
		w.Write([]byte("ok"))
	})

	r.Post("/auth/login", authService.Login)
	r.Route("/vitrine", vitrineHandler.PublicRoutes)

	r.Group(func(r chi.Router) {
		r.Use(authService.Middleware)
		r.Route("/clientes", clienteHandler.Routes)
		r.Route("/vendas", vendaHandler.Routes)
		r.Route("/parcelas", parcelaHandler.Routes)
		r.Route("/dashboard", dashboardHandler.Routes)
		r.Route("/casa", casaHandler.Routes)
		r.Route("/vitrine/admin", vitrineHandler.AdminRoutes)
	})

	log.Printf("servidor rodando na porta %s", port)
	if err := http.ListenAndServe(":"+port, r); err != nil {
		log.Fatal(err)
	}
}
