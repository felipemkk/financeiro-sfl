package venda

import (
	"testing"
	"time"
)

func TestGerarParcelas_DivisaoExata(t *testing.T) {
	inicio := time.Date(2026, time.November, 10, 0, 0, 0, 0, time.UTC)
	parcelas := GerarParcelas(300, 5, inicio)

	if len(parcelas) != 5 {
		t.Fatalf("esperava 5 parcelas, obteve %d", len(parcelas))
	}

	for i, p := range parcelas {
		if p.Valor != 60 {
			t.Errorf("parcela %d: esperava valor 60, obteve %v", i+1, p.Valor)
		}
	}

	if !parcelas[0].Vencimento.Equal(time.Date(2026, time.November, 10, 0, 0, 0, 0, time.UTC)) {
		t.Errorf("primeira parcela com vencimento errado: %v", parcelas[0].Vencimento)
	}
	if !parcelas[4].Vencimento.Equal(time.Date(2027, time.March, 10, 0, 0, 0, 0, time.UTC)) {
		t.Errorf("última parcela com vencimento errado: %v", parcelas[4].Vencimento)
	}
}

func TestGerarParcelas_AjusteDeCentavos(t *testing.T) {
	// 100 / 3 = 33.33... - a soma das parcelas deve bater exatamente com o total.
	inicio := time.Date(2026, time.January, 1, 0, 0, 0, 0, time.UTC)
	parcelas := GerarParcelas(100, 3, inicio)

	soma := 0.0
	for _, p := range parcelas {
		soma += p.Valor
	}

	if math_Round2(soma) != 100 {
		t.Errorf("soma das parcelas deveria ser 100, obteve %v", soma)
	}

	if parcelas[0].Valor != 33.33 || parcelas[1].Valor != 33.33 {
		t.Errorf("parcelas intermediárias deveriam ser 33.33, obtido %v e %v", parcelas[0].Valor, parcelas[1].Valor)
	}
	if parcelas[2].Valor != 33.34 {
		t.Errorf("última parcela deveria absorver o resto (33.34), obteve %v", parcelas[2].Valor)
	}
}

func TestGerarParcelas_FimDeMes(t *testing.T) {
	// 31 de janeiro + 1 mês deve virar 28/fev (2026 não é bissexto).
	inicio := time.Date(2026, time.January, 31, 0, 0, 0, 0, time.UTC)
	parcelas := GerarParcelas(200, 2, inicio)

	if parcelas[1].Vencimento.Day() != 28 || parcelas[1].Vencimento.Month() != time.February {
		t.Errorf("esperava 28/fev, obteve %v", parcelas[1].Vencimento)
	}
}

func math_Round2(v float64) float64 {
	return float64(int64(v*100+0.5)) / 100
}
