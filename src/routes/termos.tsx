import { createFileRoute } from '@tanstack/react-router'
import { pageHead } from '@/lib/seo'
import { CONTATO_LEGAL, PaginaLegal } from '@/components/PaginaLegal'

export const Route = createFileRoute('/termos')({
  head: pageHead({
    path: '/termos',
    title: 'Termos de Uso | Carla Patrícia Medina',
    description:
      'Condições de uso da plataforma da Carla Patrícia Medina: cadastro, propriedade intelectual do material, direito de arrependimento, cancelamento e foro, com base no Código de Defesa do Consumidor, na Lei de Direitos Autorais e no Marco Civil da Internet.',
  }),
  component: TermosPage,
})

function TermosPage() {
  return (
    <PaginaLegal
      atual="/termos"
      titulo="Termos de Uso"
      resumo={
        <>
          Estas condições regem o acesso e o uso da plataforma de ensino da professora Carla Patrícia
          Medina. Elas formam um contrato entre você e a professora, regido pelo Código Civil (Lei nº
          10.406/2002), pelo Código de Defesa do Consumidor (Lei nº 8.078/1990), pelo Decreto nº
          7.962/2013, que trata da contratação no comércio eletrônico, e pelo Marco Civil da Internet
          (Lei nº 12.965/2014).
        </>
      }
    >
      <section>
        <h2>1. Quem oferece o serviço</h2>
        <p>
          A plataforma é oferecida por <b>Carla Patrícia Medina</b>, professora de redação e
          gramática. O canal oficial de atendimento é o e-mail <a href={`mailto:${CONTATO_LEGAL}`}>{CONTATO_LEGAL}</a>,
          com atendimento de segunda a sexta, das 9h às 18h.
        </p>
        <p>
          Em atenção ao parágrafo único do art. 4º do Decreto nº 7.962/2013, as demandas enviadas por
          esse canal são respondidas em até 5 (cinco) dias.
        </p>
      </section>

      <section>
        <h2>2. Objeto</h2>
        <p>
          A plataforma dá acesso a aulas gravadas e ao vivo, materiais de estudo, atividades e
          simulados, mentorias e correção de redações, voltados à preparação para vestibulares e
          concursos. O serviço é prestado de forma remota, pela internet.
        </p>
      </section>

      <section>
        <h2>3. Aceitação</h2>
        <p>
          Ao criar uma conta, marcar a caixa de aceite ou utilizar qualquer área restrita da
          plataforma, você declara que leu, compreendeu e concorda com estes Termos e com a{' '}
          <a href="/privacidade">Política de Privacidade</a>. Se não concordar com alguma condição,
          não utilize a plataforma.
        </p>
        <p>
          Trata-se de contrato de adesão. Nos termos dos arts. 46 a 54 do Código de Defesa do
          Consumidor, as cláusulas foram redigidas em linguagem clara e ficam permanentemente
          disponíveis nesta página, antes e depois da contratação.
        </p>
      </section>

      <section>
        <h2>4. Cadastro e conta</h2>
        <p>
          O cadastro exige nome completo, CPF, e-mail e senha. Você se compromete a informar dados
          verdadeiros, completos e atualizados, e a manter a senha em sigilo.
        </p>
        <p>
          <b>O acesso é pessoal e intransferível.</b> Cada conta fica vinculada a um único aparelho:
          ao entrar em um novo dispositivo, a sessão anterior é encerrada. Emprestar, vender ou
          compartilhar credenciais é descumprimento contratual e autoriza a suspensão imediata do
          acesso, sem prejuízo das medidas previstas na seção 6.
        </p>
        <p>
          Tentativas de burlar os controles de acesso, de obter conteúdo por meios automatizados ou
          de acessar dados de outros alunos podem configurar o crime do art. 154-A do Código Penal,
          incluído pela Lei nº 12.737/2012.
        </p>
      </section>

      <section>
        <h2>5. Alunos menores de 18 anos</h2>
        <p>
          O aluno com menos de 18 anos é absoluta ou relativamente incapaz para os atos da vida
          civil (arts. 3º a 5º do Código Civil) e, por isso, a matrícula deve ser feita ou assistida
          por pai, mãe ou responsável legal, que responde pelas obrigações deste contrato.
        </p>
        <p>
          O tratamento dos dados de crianças e adolescentes observa o art. 14 da Lei nº 13.709/2018 e
          o Estatuto da Criança e do Adolescente (Lei nº 8.069/1990), sempre no melhor interesse do
          aluno. Os detalhes estão na <a href="/privacidade">Política de Privacidade</a>.
        </p>
      </section>

      <section>
        <h2>6. Propriedade intelectual</h2>
        <p>
          Aulas, videoaulas, apostilas, listas de exercícios, simulados, gabaritos comentados,
          correções, textos, imagens, marca e o próprio site são obras protegidas pela Lei de
          Direitos Autorais (Lei nº 9.610/1998), em especial pelos arts. 7º, 22 e 29, e pertencem à
          professora Carla Patrícia Medina ou a quem lhe licenciou o uso.
        </p>
        <p>
          A matrícula concede apenas uma licença de uso pessoal, não exclusiva, intransferível e
          limitada ao período de vigência do curso, para fins exclusivamente de estudo próprio.
        </p>
        <p>
          Sem autorização prévia e expressa, é vedado reproduzir, distribuir, publicar, transmitir,
          revender, ceder, exibir em grupo, hospedar em outro serviço ou usar para produzir obra
          derivada qualquer conteúdo da plataforma — inclusive prints, gravações de tela e cópias de
          arquivos. A violação sujeita o infrator às sanções civis dos arts. 102 a 104 da Lei nº
          9.610/1998 e à responsabilidade penal do art. 184 do Código Penal.
        </p>
      </section>

      <section>
        <h2>7. Marca d'água e rastreabilidade</h2>
        <p>
          Os materiais baixados são carimbados automaticamente com o nome e o CPF do aluno que fez o
          download, junto com a expressão "uso exclusivo e intransferível". A marca serve para
          desestimular a redistribuição e para identificar a origem de uma cópia que circule
          indevidamente.
        </p>
        <p>
          Esse tratamento se apoia no legítimo interesse de proteção da propriedade intelectual e de
          prevenção à fraude, nos termos do art. 7º, IX, e do art. 10 da Lei nº 13.709/2018. Remover,
          ocultar ou adulterar a marca d'água é conduta vedada e caracteriza, ainda, violação do art.
          107 da Lei nº 9.610/1998.
        </p>
      </section>

      <section>
        <h2>8. Condutas vedadas</h2>
        <p>Ao usar a plataforma, você não pode:</p>
        <ul>
          <li>compartilhar sua conta ou permitir que terceiros a utilizem;</li>
          <li>copiar, gravar, imprimir para terceiros ou redistribuir o conteúdo;</li>
          <li>usar robôs, raspadores ou qualquer automação para extrair material;</li>
          <li>tentar acessar áreas administrativas, dados de outros alunos ou o código do sistema;</li>
          <li>enviar arquivos com vírus, conteúdo ilícito ou que viole direito de terceiros;</li>
          <li>ofender professores, colegas ou a equipe nos canais de comunicação da plataforma.</li>
        </ul>
        <p>
          Constatado o descumprimento, o acesso pode ser suspenso ou encerrado, com comunicação ao
          aluno e sem devolução dos valores relativos ao período já usufruído, ressalvada a apuração
          de perdas e danos.
        </p>
      </section>

      <section>
        <h2>9. Matrícula, valores e pagamento</h2>
        <p>
          Os valores, a forma de pagamento e a duração de cada curso ou plano são informados antes da
          contratação e no momento da matrícula, conforme exige o art. 6º, III, do Código de Defesa
          do Consumidor. O acesso à área do aluno é liberado após a confirmação do pagamento e da
          aprovação do cadastro.
        </p>
      </section>

      <section>
        <h2>10. Direito de arrependimento</h2>
        <p>
          Por se tratar de contratação feita fora do estabelecimento comercial, você pode desistir do
          contrato em até <b>7 (sete) dias corridos</b> contados da contratação ou do início do
          acesso, o que ocorrer por último, nos termos do art. 49 do Código de Defesa do Consumidor e
          do art. 5º do Decreto nº 7.962/2013.
        </p>
        <p>
          Basta pedir o cancelamento pelo e-mail de atendimento dentro desse prazo. Os valores pagos
          são devolvidos integralmente e de forma imediata, monetariamente atualizados, na forma do
          parágrafo único do art. 49 do CDC.
        </p>
      </section>

      <section>
        <h2>11. Cancelamento após o prazo de arrependimento</h2>
        <p>
          Passados os 7 dias, o aluno pode encerrar a matrícula a qualquer momento pelo e-mail de
          atendimento. O acesso permanece liberado até o fim do período já pago e não há cobrança de
          multa por desistência. Valores referentes a períodos ainda não usufruídos, quando houver,
          são devolvidos de forma proporcional.
        </p>
      </section>

      <section>
        <h2>12. Disponibilidade e alterações no serviço</h2>
        <p>
          A plataforma é oferecida em regime de melhores esforços. Pode haver interrupções para
          manutenção, atualização ou por falha de serviços de terceiros (hospedagem, provedor de
          internet, envio de e-mails). Interrupções programadas são avisadas com antecedência sempre
          que possível.
        </p>
        <p>
          O cronograma, a ordem dos módulos e a grade de aulas ao vivo podem ser ajustados ao longo
          do curso, preservados o conteúdo e a carga horária contratados.
        </p>
      </section>

      <section>
        <h2>13. Resultados</h2>
        <p>
          A plataforma oferece preparação, orientação e correção. Aprovação em vestibular ou concurso
          depende de fatores fora do controle da professora — dedicação do aluno, concorrência e
          critérios da banca —, e por isso <b>não é e não pode ser garantida</b>. Depoimentos e
          resultados divulgados no site são experiências individuais e não representam promessa de
          desempenho, em observância ao art. 37 do Código de Defesa do Consumidor.
        </p>
      </section>

      <section>
        <h2>14. Proteção de dados pessoais</h2>
        <p>
          O tratamento dos dados pessoais coletados pela plataforma segue a Lei nº 13.709/2018
          (LGPD) e está descrito na <a href="/privacidade">Política de Privacidade</a>. O resumo dos
          seus direitos e o canal para exercê-los estão na página{' '}
          <a href="/lgpd">LGPD e seus direitos</a>.
        </p>
        <p>
          Os registros de acesso à aplicação são mantidos sob sigilo, em ambiente controlado e
          seguro, pelo prazo de 6 (seis) meses, conforme o art. 15 do Marco Civil da Internet.
        </p>
      </section>

      <section>
        <h2>15. Alteração destes Termos</h2>
        <p>
          Estes Termos podem ser atualizados para refletir mudanças no serviço ou na legislação. A
          nova versão passa a valer na data indicada no topo desta página e é avisada na própria
          plataforma. Alterações que restrinjam direitos do aluno são comunicadas com antecedência
          mínima de 30 (trinta) dias, e o aluno que não concordar pode encerrar a matrícula sem ônus.
        </p>
      </section>

      <section>
        <h2>16. Lei aplicável e foro</h2>
        <p>
          Este contrato é regido pelas leis brasileiras. Fica eleito o foro do domicílio do aluno
          para dirimir controvérsias, na forma do art. 101, I, do Código de Defesa do Consumidor.
        </p>
        <p>
          Antes de qualquer medida judicial, procure o atendimento pelo e-mail{' '}
          <a href={`mailto:${CONTATO_LEGAL}`}>{CONTATO_LEGAL}</a>: a maior parte das questões se
          resolve por lá.
        </p>
      </section>
    </PaginaLegal>
  )
}
