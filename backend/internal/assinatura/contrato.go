package assinatura

import (
	"bytes"
	"fmt"
	"time"

	"github.com/go-pdf/fpdf"
)

type ParcelaContrato struct {
	Numero     int
	Valor      float64
	Vencimento time.Time
}

type DadosContrato struct {
	ClienteNome     string
	ClienteCPF      string
	ClienteEndereco string
	Produto         string
	ValorTotal      float64
	Parcelas        []ParcelaContrato
}

// GerarContratoPDF monta um contrato de venda a prazo com cláusula de
// confissão de dívida (ver pesquisa jurídica: esse instrumento é mais seguro
// digitalmente do que uma nota promissória eletrônica, por não depender da
// exigência cambiária de assinatura de próprio punho da Lei Uniforme de
// Genebra). Não substitui revisão por advogado antes do uso em produção.
func GerarContratoPDF(d DadosContrato) ([]byte, error) {
	pdf := fpdf.New("P", "mm", "A4", "")
	tr := pdf.UnicodeTranslatorFromDescriptor("")
	pdf.AddPage()
	pdf.SetMargins(20, 20, 20)

	pdf.SetFont("Arial", "B", 13)
	pdf.MultiCell(0, 7, tr("CONTRATO DE VENDA A PRAZO COM CONFISSÃO DE DÍVIDA"), "", "C", false)
	pdf.Ln(4)

	pdf.SetFont("Arial", "", 11)

	cpf := d.ClienteCPF
	if cpf == "" {
		cpf = "não informado"
	}
	endereco := d.ClienteEndereco
	if endereco == "" {
		endereco = "não informado"
	}

	abertura := fmt.Sprintf(
		"CONTRATANTE (credora): Store Flávia Lima.\n\n"+
			"CONTRATADA (devedora): %s, CPF %s, residente em %s.\n\n"+
			"As partes acima identificadas, qualificadas e de comum acordo, firmam o presente "+
			"contrato de compra e venda a prazo com cláusula de confissão de dívida, que se rege "+
			"pelas cláusulas seguintes.",
		d.ClienteNome, cpf, endereco,
	)
	pdf.MultiCell(0, 6, tr(abertura), "", "L", false)
	pdf.Ln(2)

	clausula1 := fmt.Sprintf(
		"1. DO OBJETO — A CONTRATADA adquiriu da CONTRATANTE o(s) seguinte(s) produto(s)/serviço(s): "+
			"%s, pelo valor total de R$ %.2f (reais).",
		d.Produto, d.ValorTotal,
	)
	pdf.MultiCell(0, 6, tr(clausula1), "", "L", false)
	pdf.Ln(2)

	pdf.MultiCell(0, 6, tr(
		"2. DA CONFISSÃO DE DÍVIDA — A CONTRATADA reconhece, de forma livre, expressa, "+
			"consciente e irrevogável, que deve à CONTRATANTE a quantia total indicada na "+
			"cláusula 1, comprometendo-se a pagá-la integralmente nas seguintes parcelas:",
	), "", "L", false)
	pdf.Ln(1)

	pdf.SetFont("Arial", "B", 11)
	for _, p := range d.Parcelas {
		linha := fmt.Sprintf(
			"   Parcela %d: R$ %.2f — vencimento em %s",
			p.Numero, p.Valor, p.Vencimento.Format("02/01/2006"),
		)
		pdf.MultiCell(0, 6, tr(linha), "", "L", false)
	}
	pdf.SetFont("Arial", "", 11)
	pdf.Ln(2)

	clausulasFinais := "3. DO INADIMPLEMENTO — O não pagamento de qualquer parcela na data de " +
		"vencimento constitui a CONTRATADA em mora de pleno direito, independentemente de " +
		"aviso, notificação ou interpelação judicial ou extrajudicial, autorizando a " +
		"CONTRATANTE a cobrar o valor devido, acrescido de juros, multa e correção monetária " +
		"na forma da lei, pelas vias extrajudicial e judicial cabíveis, servindo o presente " +
		"instrumento, nos termos do art. 784 do Código de Processo Civil, como título executivo " +
		"extrajudicial.\n\n" +
		"4. DA ASSINATURA ELETRÔNICA — Este contrato é firmado por assinatura eletrônica, nos " +
		"termos da Medida Provisória nº 2.200-2/2001 (art. 10, §2º) e da Lei nº 14.063/2020, " +
		"tendo as partes livremente aceitado esse meio de comprovação de autoria e integridade, " +
		"o que lhe confere plena validade jurídica entre as partes.\n\n" +
		"5. DO FORO — Fica eleito o foro do domicílio da CONTRATADA para dirimir quaisquer " +
		"dúvidas ou litígios oriundos deste contrato, com renúncia a qualquer outro, por mais " +
		"privilegiado que seja."
	pdf.MultiCell(0, 6, tr(clausulasFinais), "", "L", false)
	pdf.Ln(6)

	rodape := fmt.Sprintf("Documento gerado eletronicamente em %s.", time.Now().Format("02/01/2006 15:04"))
	pdf.SetFont("Arial", "I", 9)
	pdf.MultiCell(0, 5, tr(rodape), "", "L", false)

	var buf bytes.Buffer
	if err := pdf.Output(&buf); err != nil {
		return nil, err
	}
	return buf.Bytes(), nil
}
