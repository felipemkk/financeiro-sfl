// Package assinatura integra com a Autentique (api.autentique.com.br) para
// gerar e enviar contratos de venda a prazo para assinatura eletrônica das
// clientes, servindo como instrumento de cobrança em caso de inadimplência.
package assinatura

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"mime/multipart"
	"net/http"
	"time"
)

const endpointGraphQL = "https://api.autentique.com.br/v2/graphql"

type Client struct {
	apiToken string
	http     *http.Client
}

func NewClient(apiToken string) *Client {
	return &Client{apiToken: apiToken, http: &http.Client{Timeout: 30 * time.Second}}
}

// Configurado indica se há um token de API definido (via AUTENTIQUE_API_TOKEN).
func (c *Client) Configurado() bool {
	return c.apiToken != ""
}

type Signatario struct {
	Nome string
	CPF  string
}

type DocumentoCriado struct {
	DocumentoID    string
	AssinaturaID   string
	LinkAssinatura string
}

type graphqlResposta struct {
	Data struct {
		CreateDocument struct {
			ID         string `json:"id"`
			Signatures []struct {
				PublicID string `json:"public_id"`
				Link     struct {
					ShortLink string `json:"short_link"`
				} `json:"link"`
			} `json:"signatures"`
		} `json:"createDocument"`
	} `json:"data"`
	Errors []struct {
		Message    string `json:"message"`
		Extensions struct {
			Validation map[string][]string `json:"validation"`
		} `json:"extensions"`
	} `json:"errors"`
}

// CriarDocumento envia o PDF do contrato para a Autentique e cadastra a
// cliente como signatária, com link de assinatura (para enviarmos nós mesmos
// pelo WhatsApp da loja) em vez de a própria Autentique notificar a cliente.
func (c *Client) CriarDocumento(ctx context.Context, nomeDocumento string, pdf []byte, signatario Signatario) (DocumentoCriado, error) {
	if !c.Configurado() {
		return DocumentoCriado{}, fmt.Errorf("assinatura eletrônica não configurada: defina AUTENTIQUE_API_TOKEN")
	}

	const query = `mutation CriarContrato($document: DocumentInput!, $signers: [SignerInput!]!, $file: Upload!) {
		createDocument(document: $document, signers: $signers, file: $file) {
			id
			signatures {
				public_id
				link { short_link }
			}
		}
	}`

	operacoes := map[string]interface{}{
		"query": query,
		"variables": map[string]interface{}{
			"document": map[string]interface{}{"name": nomeDocumento},
			"signers": []map[string]interface{}{
				{
					"name":            signatario.Nome,
					"action":          "SIGN",
					"delivery_method": "DELIVERY_METHOD_LINK",
					"configs":         map[string]interface{}{"cpf": signatario.CPF},
				},
			},
			"file": nil,
		},
	}
	operacoesJSON, err := json.Marshal(operacoes)
	if err != nil {
		return DocumentoCriado{}, err
	}

	var corpo bytes.Buffer
	mw := multipart.NewWriter(&corpo)
	if err := mw.WriteField("operations", string(operacoesJSON)); err != nil {
		return DocumentoCriado{}, err
	}
	if err := mw.WriteField("map", `{"file": ["variables.file"]}`); err != nil {
		return DocumentoCriado{}, err
	}
	arquivo, err := mw.CreateFormFile("file", nomeDocumento+".pdf")
	if err != nil {
		return DocumentoCriado{}, err
	}
	if _, err := arquivo.Write(pdf); err != nil {
		return DocumentoCriado{}, err
	}
	if err := mw.Close(); err != nil {
		return DocumentoCriado{}, err
	}

	req, err := http.NewRequestWithContext(ctx, http.MethodPost, endpointGraphQL, &corpo)
	if err != nil {
		return DocumentoCriado{}, err
	}
	req.Header.Set("Authorization", "Bearer "+c.apiToken)
	req.Header.Set("Content-Type", mw.FormDataContentType())

	resp, err := c.http.Do(req)
	if err != nil {
		return DocumentoCriado{}, err
	}
	defer resp.Body.Close()

	corpoResposta, err := io.ReadAll(resp.Body)
	if err != nil {
		return DocumentoCriado{}, err
	}

	var r graphqlResposta
	if err := json.Unmarshal(corpoResposta, &r); err != nil {
		return DocumentoCriado{}, fmt.Errorf("resposta inesperada da Autentique: %s", string(corpoResposta))
	}
	if len(r.Errors) > 0 {
		if msgs, ok := r.Errors[0].Extensions.Validation["signers.0.configs.cpf"]; ok && len(msgs) > 0 {
			return DocumentoCriado{}, fmt.Errorf("CPF da cliente parece inválido — confira o cadastro antes de gerar o contrato")
		}
		return DocumentoCriado{}, fmt.Errorf("erro da Autentique: %s", r.Errors[0].Message)
	}
	if r.Data.CreateDocument.ID == "" || len(r.Data.CreateDocument.Signatures) == 0 {
		return DocumentoCriado{}, fmt.Errorf("resposta da Autentique sem documento/assinatura: %s", string(corpoResposta))
	}

	// A Autentique costuma incluir, além da cliente, uma assinatura extra
	// referente à conta dona do token (sem link, delivery_method por
	// e-mail) — por isso escolhemos explicitamente a que tem link de
	// assinatura gerado, em vez de assumir que é sempre a primeira da lista.
	for _, s := range r.Data.CreateDocument.Signatures {
		if s.Link.ShortLink != "" {
			return DocumentoCriado{
				DocumentoID:    r.Data.CreateDocument.ID,
				AssinaturaID:   s.PublicID,
				LinkAssinatura: s.Link.ShortLink,
			}, nil
		}
	}
	return DocumentoCriado{}, fmt.Errorf("a Autentique não retornou um link de assinatura para a cliente")
}
