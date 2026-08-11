package venda

import (
	"math"
	"time"
)

// ParcelaGerada representa uma parcela calculada antes de ser persistida.
type ParcelaGerada struct {
	Numero     int
	Valor      float64
	Vencimento time.Time
}

// GerarParcelas divide valorTotal em numParcelas parcelas mensais iguais,
// a partir de dataPrimeiraParcela. Qualquer diferença de arredondamento
// (centavos) é ajustada na última parcela, para que a soma bata exatamente
// com valorTotal.
func GerarParcelas(valorTotal float64, numParcelas int, dataPrimeiraParcela time.Time) []ParcelaGerada {
	if numParcelas <= 0 {
		return nil
	}

	valorCentavos := int64(math.Round(valorTotal * 100))
	baseCentavos := valorCentavos / int64(numParcelas)
	resto := valorCentavos - baseCentavos*int64(numParcelas)

	parcelas := make([]ParcelaGerada, numParcelas)
	for i := 0; i < numParcelas; i++ {
		centavos := baseCentavos
		if i == numParcelas-1 {
			centavos += resto
		}
		parcelas[i] = ParcelaGerada{
			Numero:     i + 1,
			Valor:      float64(centavos) / 100,
			Vencimento: addMonths(dataPrimeiraParcela, i),
		}
	}
	return parcelas
}

// addMonths soma meses a uma data preservando o dia quando possível
// (ex: 31/jan + 1 mês = 28 ou 29/fev, não "3 de março").
func addMonths(d time.Time, months int) time.Time {
	year, month, day := d.Date()
	firstOfTargetMonth := time.Date(year, month+time.Month(months), 1, 0, 0, 0, 0, d.Location())
	lastDayOfTargetMonth := firstOfTargetMonth.AddDate(0, 1, -1).Day()
	if day > lastDayOfTargetMonth {
		day = lastDayOfTargetMonth
	}
	return time.Date(firstOfTargetMonth.Year(), firstOfTargetMonth.Month(), day, 0, 0, 0, 0, d.Location())
}
