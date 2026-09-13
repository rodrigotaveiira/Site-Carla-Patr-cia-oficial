import { createFileRoute } from '@tanstack/react-router'
import { pageHead } from '@/lib/seo'
import { CONTATO_LEGAL, PaginaLegal } from '@/components/PaginaLegal'

export const Route = createFileRoute('/lgpd')({
  head: pageHead({
    path: '/lgpd',
    title: 'LGPD e seus direitos | Carla Patrícia Medina',
    description:
      'Os nove direitos que o art. 18 da Lei nº 13.709/2018 garante sobre seus dados pessoais, os princípios do art. 6º que a plataforma segue, como fazer um pedido, os prazos de resposta do art. 19 e como reclamar à ANPD.',
  }),
  component: LgpdPage,
})

// Os nove direitos do art. 18 da LGPD, na ordem da lei, cada um com a tradução
// do que significa na prática dentro da plataforma.
const DIREITOS = [
  {
    inciso: 'I',
    titulo: 'Confirmação de que existe tratamento',
    texto: 'Saber se a plataforma trata algum dado seu — mesmo que você nunca tenha se matriculado.',
  },
  {
    inciso: 'II',
    titulo: 'Acesso aos dados',
    texto:
      'Receber cópia dos dados que temos sobre você: cadastro, redações, notas, progresso, recados e registros de acesso.',
  },
  {
    inciso: 'III',
    titulo: 'Correção',
    texto:
      'Corrigir dado incompleto, inexato ou desatualizado. Nome, e-mail e foto você mesmo ajusta no perfil; CPF e demais registros são corrigidos pelo canal de contato.',
  },
  {
    inciso: 'IV',
    titulo: 'Anonimização, bloqueio ou eliminação',
    texto:
      'Pedir a anonimização, o bloqueio ou a exclusão de dados desnecessários, excessivos ou tratados em desacordo com a lei.',
  },
  {
    inciso: 'V',
    titulo: 'Portabilidade',
    texto:
      'Pedir, de forma expressa, que seus dados sejam transferidos a outro fornecedor de serviço, observados os segredos comercial e industrial.',
  },
  {
    inciso: 'VI',
    titulo: 'Eliminação dos dados tratados com consentimento',
    texto:
      'Pedir a exclusão dos dados que só existem porque você consentiu — ressalvadas as hipóteses de guarda obrigatória do art. 16 da LGPD.',
  },
  {
    inciso: 'VII',
    titulo: 'Informação sobre compartilhamento',
    texto:
      'Saber com que entidades públicas e privadas compartilhamos seus dados. Os operadores que usamos estão listados na Política de Privacidade.',
  },
  {
    inciso: 'VIII',
    titulo: 'Informação sobre a recusa do consentimento',
    texto:
      'Saber que você pode não consentir e quais são as consequências disso — por exemplo, não receber e-mails de aviso do curso.',
  },
  {
    inciso: 'IX',
    titulo: 'Revogação do consentimento',
    texto:
      'Retirar, a qualquer momento, um consentimento já dado, por procedimento gratuito e facilitado (art. 8º, § 5º, da LGPD).',
  },
] as const

// Os dez princípios do art. 6º da LGPD.
const PRINCIPIOS = [
  ['Finalidade', 'Cada dado é usado para um propósito legítimo, específico e informado a você.'],
  ['Adequação', 'O tratamento é compatível com a finalidade que foi informada.'],
  ['Necessidade', 'Coletamos o mínimo necessário — nada de dado "por via das dúvidas".'],
  ['Livre acesso', 'Você consulta a qualquer momento a forma e a duração do tratamento.'],
  ['Qualidade dos dados', 'Mantemos os dados exatos, claros e atualizados.'],
  ['Transparência', 'Informação clara sobre quem trata seus dados e como.'],
  ['Segurança', 'Medidas técnicas e administrativas para proteger os dados.'],
  ['Prevenção', 'Cuidados para evitar dano antes que ele aconteça.'],
  ['Não discriminação', 'Nenhum tratamento para fins discriminatórios, ilícitos ou abusivos.'],
  ['Responsabilização', 'Conseguimos demonstrar que as medidas adotadas são eficazes.'],
] as const

function LgpdPage() {
  return (
    <PaginaLegal
      atual="/lgpd"
      titulo="LGPD e seus direitos"
      resumo={
        <>
          A Lei nº 13.709, de 14 de agosto de 2018 — a Lei Geral de Proteção de Dados Pessoais —
          está em vigor desde 18 de setembro de 2020, com as sanções administrativas aplicáveis desde
          1º de agosto de 2021. Esta página reúne, em linguagem direta, o que ela garante a você em
          relação aos dados tratados por esta plataforma e como exercer cada direito.
        </>
      }
    >
      <section>
        <h2>1. A quem esta página se dirige</h2>
        <p>
          A LGPD chama de <b>titular</b> a pessoa a quem os dados se referem (art. 5º, V). Aqui, o
          titular é o aluno, o responsável legal do aluno menor de idade ou quem entrou em contato
          pelo formulário do site.
        </p>
        <p>
          A <b>controladora</b> — quem decide sobre o tratamento (art. 5º, VI) — é a professora Carla
          Patrícia Medina. O detalhamento de quais dados são tratados, com que finalidade e por
          quanto tempo está na <a href="/privacidade">Política de Privacidade</a>.
        </p>
      </section>

      <section>
        <h2>2. Princípios que orientam o tratamento</h2>
        <p>
          O art. 6º da LGPD lista dez princípios que toda atividade de tratamento deve observar, além
          da boa-fé. São eles:
        </p>
        <dl className="legal-lista">
          {PRINCIPIOS.map(([nome, texto]) => (
            <div key={nome}>
              <dt>{nome}</dt>
              <dd>{texto}</dd>
            </div>
          ))}
        </dl>
      </section>

      <section>
        <h2>3. Seus direitos, um a um</h2>
        <p>
          O art. 18 da LGPD assegura nove direitos ao titular, exercíveis a qualquer momento e de
          forma gratuita:
        </p>
        <dl className="legal-lista">
          {DIREITOS.map((direito) => (
            <div key={direito.inciso}>
              <dt>
                <span className="legal-inciso">Art. 18, {direito.inciso}</span>
                {direito.titulo}
              </dt>
              <dd>{direito.texto}</dd>
            </div>
          ))}
        </dl>
      </section>

      <section>
        <h2>4. Como fazer um pedido</h2>
        <p>
          Envie a solicitação para <a href={`mailto:${CONTATO_LEGAL}`}>{CONTATO_LEGAL}</a> a partir do
          e-mail cadastrado na plataforma, dizendo qual direito você quer exercer. Se o pedido vier
          de outro endereço, podemos pedir uma confirmação adicional de identidade — é uma exigência
          de segurança, não um obstáculo: sem ela, qualquer pessoa poderia pedir os dados de um
          aluno.
        </p>
        <p>
          Pedido feito por responsável legal de aluno menor deve indicar essa condição, conforme o
          art. 14 da LGPD.
        </p>
      </section>

      <section>
        <h2>5. Prazos de resposta</h2>
        <p>Os prazos são os do art. 19 da LGPD:</p>
        <ul>
          <li>
            <b>Imediatamente</b>, quando o pedido puder ser respondido em formato simplificado (art.
            19, I);
          </li>
          <li>
            <b>Em até 15 (quinze) dias</b> contados do requerimento, quando for necessária declaração
            clara e completa sobre a origem dos dados, os critérios e a finalidade do tratamento
            (art. 19, II).
          </li>
        </ul>
        <p>
          Se, excepcionalmente, não for possível atender de imediato, respondemos dentro do prazo
          informando que não somos agente de tratamento daquele dado ou apresentando as razões de
          fato ou de direito que impedem a medida (art. 18, § 4º).
        </p>
      </section>

      <section>
        <h2>6. Quando um pedido pode ser recusado ou limitado</h2>
        <p>
          Alguns dados não podem ser apagados na hora do pedido, e a lei diz por quê. O art. 16 da
          LGPD autoriza a conservação para cumprimento de obrigação legal ou regulatória e para o uso
          exclusivo da controladora, com acesso vedado a terceiros. Na prática:
        </p>
        <ul>
          <li>
            registros de acesso à aplicação ficam guardados por 6 (seis) meses por força do art. 15 do
            Marco Civil da Internet (Lei nº 12.965/2014);
          </li>
          <li>
            dados de matrícula e pagamento são mantidos pelos prazos fiscais e prescricionais
            aplicáveis;
          </li>
          <li>
            dados necessários à execução do contrato não podem ser eliminados enquanto a matrícula
            estiver ativa — nesse caso, o caminho é encerrar a matrícula e então pedir a exclusão.
          </li>
        </ul>
        <p>
          Fora dessas hipóteses, os dados são eliminados ao término do tratamento (art. 15 da LGPD).
        </p>
      </section>

      <section>
        <h2>7. Revogação do consentimento</h2>
        <p>
          Quando o tratamento se apoiar em consentimento, você pode revogá-lo a qualquer tempo, por
          manifestação expressa, mediante procedimento gratuito e facilitado, na forma do art. 8º, §
          5º, da LGPD. A revogação não invalida o tratamento feito antes dela (art. 8º, § 6º) e não
          alcança as atividades que se apoiam em outra base legal, como a execução do contrato de
          matrícula.
        </p>
      </section>

      <section>
        <h2>8. Reclamação à ANPD</h2>
        <p>
          Se a resposta não resolver, você pode peticionar contra a controladora perante a Autoridade
          Nacional de Proteção de Dados, direito previsto no art. 18, § 1º, da LGPD, e também
          procurar os órgãos de defesa do consumidor.
        </p>
        <p>
          A ANPD atende pelo endereço{' '}
          <a href="https://www.gov.br/anpd" target="_blank" rel="noreferrer">
            gov.br/anpd
          </a>
          .
        </p>
      </section>

      <section>
        <h2>9. Segurança e incidentes</h2>
        <p>
          As medidas de proteção adotadas estão descritas na{' '}
          <a href="/privacidade">Política de Privacidade</a>. Ocorrendo incidente de segurança que
          possa acarretar risco ou dano relevante a você, faremos a comunicação à ANPD e a você, na
          forma do art. 48 da LGPD e da regulamentação da Autoridade.
        </p>
      </section>

      <section>
        <h2>10. Documentos relacionados</h2>
        <p>
          A <a href="/privacidade">Política de Privacidade</a> descreve o tratamento em detalhe. Os{' '}
          <a href="/termos">Termos de Uso</a> regem a relação contratual entre você e a professora.
          Em caso de divergência sobre proteção de dados, prevalece o que estiver na Política de
          Privacidade.
        </p>
      </section>
    </PaginaLegal>
  )
}
