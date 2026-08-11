// Comando auxiliar para criar/atualizar a conta de login única.
// Uso: go run ./cmd/seed <email> <senha>
package main

import (
	"context"
	"fmt"
	"log"
	"os"

	"github.com/joho/godotenv"

	"financeiro-sfl/backend/internal/auth"
	"financeiro-sfl/backend/internal/db"
)

func main() {
	_ = godotenv.Load()

	if len(os.Args) != 3 {
		fmt.Println("uso: go run ./cmd/seed <email> <senha>")
		os.Exit(1)
	}
	email, senha := os.Args[1], os.Args[2]

	connString := os.Getenv("DATABASE_URL")
	if connString == "" {
		connString = "postgres://lojafiado:lojafiado@localhost:5432/lojafiado"
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

	hash, err := auth.HashSenha(senha)
	if err != nil {
		log.Fatalf("erro ao gerar hash: %v", err)
	}

	_, err = pool.Exec(ctx, `
		INSERT INTO usuarios (email, senha_hash) VALUES ($1, $2)
		ON CONFLICT (email) DO UPDATE SET senha_hash = EXCLUDED.senha_hash`,
		email, hash)
	if err != nil {
		log.Fatalf("erro ao salvar usuário: %v", err)
	}

	fmt.Printf("usuário %s criado/atualizado com sucesso\n", email)
}
