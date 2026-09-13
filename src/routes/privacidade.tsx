import { createFileRoute } from '@tanstack/react-router'
import { pageHead } from '@/lib/seo'
import { BaseLegal, CONTATO_LEGAL, PaginaLegal } from '@/components/PaginaLegal'

export const Route = createFileRoute('/privacidade')({
  head: pageHead({
    path: '/privacidade',
    title: 'Política de Privacidade | Carla Patrícia Medina',
    description:
      'Quais dados pessoais a plataforma da Carla Patrícia Medina trata, com que finalidade e base legal, com quem compartilha, por quanto tempo guarda e como você exerce seus direitos, nos termos da Lei nº 13.709/2018 (LGPD).',
  }),
  component: PrivacidadePage,
})

function PrivacidadePage() {
  return (
    <PaginaLegal
      atual="/privacidade"
      titulo="Política de Privacidade"
      resumo={
        <>
          Esta política explica como a plataforma de ensino da professora Carla Patrícia Medina
          coleta, usa, compartilha, protege e descarta dados pessoais, em cumprimento à Lei nº
          13.709/2018 — a Lei Geral de Proteção de Dados Pessoais (LGPD) — e ao Marco Civil da
          Internet (Lei nº 12.965/2014).
        </>
      }
    >
      <section>
        <h2>1. Controladora dos dados</h2>
        <p>
          A controladora, definida pelo art. 5º, VI, da LGPD como quem decide sobre o tratamento dos
          dados, é a professora <b>Carla Patrícia Medina</b>, responsável pela plataforma.
        </p>
        <p>
          Contato para assuntos de proteção de dados:{' '}
          <a href={`mailto:${CONTATO_LEGAL}`}>{CONTATO_LEGAL}</a>.
        </p>
      </section>

      <section>
        <h2>2. Encarregado pelo tratamento de dados</h2>
        <p>
          O art. 41 da LGPD prevê a figura do encarregado, que é o canal entre você, a controladora e
          a Autoridade Nacional de Proteção de Dados (ANPD). A Resolução CD/ANPD nº 2/2022 dispensa
          agentes de tratamento de pequeno porte de indicar formalmente um encarregado, mas mantém a
          obrigação de oferecer um canal de comunicação.
        </p>
        <p>
          Esse canal é o e-mail <a href={`mailto:${CONTATO_LEGAL}`}>{CONTATO_LEGAL}</a>, atendido
          diretamente pela professora.
        </p>
      </section>

      <section>
        <h2>3. Quais dados tratamos</h2>

        <h3>Dados de cadastro</h3>
        <p>
          Nome completo, CPF, e-mail e senha. A senha nunca é guardada em texto legível — o serviço
          de identidade armazena apenas um resumo criptográfico dela, que não permite recuperar a
          senha original. A foto de perfil só existe se você enviar uma.
        </p>

        <h3>Dados acadêmicos</h3>
        <p>
          Redações enviadas e suas correções, notas e comentários por competência, respostas de
          simulados e atividades, progresso nas aulas, materiais baixados, mentorias agendadas e
          presença em aulas ao vivo.
        </p>

        <h3>Comunicações</h3>
        <p>
          Recados trocados com a professora dentro da plataforma, e-mails transacionais enviados a
          você (nova correção, novo material, lembrete de mentoria ou de simulado) e as mensagens
          enviadas pelo formulário de contato do site — que coleta nome, e-mail, WhatsApp e o texto
          da mensagem.
        </p>

        <h3>Dados técnicos e de segurança</h3>
        <p>
          Registros de login e de acesso, identificação do aparelho usado para entrar na conta e
          data e hora dos acessos. Esses registros sustentam a regra de um aparelho por conta e a
          detecção de uso indevido de credenciais.
        </p>

        <h3>Dados que não tratamos</h3>
        <p>
          A plataforma <b>não coleta dados pessoais sensíveis</b> — origem racial ou étnica,
          convicção religiosa, opinião política, filiação sindical, dado de saúde, vida sexual, dado
          genético ou biométrico —, na acepção do art. 5º, II, da LGPD. Não peça e não envie esse
          tipo de informação pelos canais da plataforma.
        </p>
      </section>

      <section>
        <h2>4. Para que usamos e com que base legal</h2>
        <p>
          Todo tratamento tem uma finalidade determinada e uma hipótese legal que o autoriza, como
          exigem os arts. 6º, I, e 7º da LGPD.
        </p>

        <h3>Manter sua matrícula e dar acesso ao curso</h3>
        <p>
          Identificar o aluno, liberar o conteúdo contratado, corrigir redações, registrar notas e
          progresso, agendar mentorias e emitir os avisos do curso.
        </p>
        <BaseLegal>execução de contrato — art. 7º, V, da Lei nº 13.709/2018.</BaseLegal>

        <h3>Proteger o conteúdo e a conta</h3>
        <p>
          Carimbar nome e CPF nos materiais baixados, limitar a conta a um aparelho, aplicar limites
          de uso e investigar acessos suspeitos.
        </p>
        <BaseLegal>
          legítimo interesse — art. 7º, IX, e art. 10 da Lei nº 13.709/2018 —, limitado ao
          estritamente necessário para prevenir fraude e proteger a propriedade intelectual.
        </BaseLegal>

        <h3>Responder ao formulário de contato do site</h3>
        <p>
          Retornar o contato de quem pede informações sobre os cursos, ainda sem matrícula.
        </p>
        <BaseLegal>
          consentimento — art. 7º, I, e art. 8º da Lei nº 13.709/2018 —, manifestado ao marcar a
          caixa de aceite antes de enviar a mensagem.
        </BaseLegal>

        <h3>Guardar registros de acesso</h3>
        <p>Manter o histórico de acessos à aplicação pelo prazo exigido em lei.</p>
        <BaseLegal>
          cumprimento de obrigação legal — art. 7º, II, da Lei nº 13.709/2018, combinado com o art.
          15 do Marco Civil da Internet.
        </BaseLegal>
      </section>

      <section>
        <h2>5. Dados de crianças e adolescentes</h2>
        <p>
          Boa parte dos alunos é menor de idade. O tratamento desses dados é feito sempre no melhor
          interesse do aluno, como determina o art. 14 da LGPD.
        </p>
        <p>
          A matrícula de aluno com menos de 12 anos completos depende de consentimento específico e
          em destaque de pelo menos um dos pais ou do responsável legal (art. 14, § 1º). Não
          condicionamos a participação em nenhuma atividade ao fornecimento de dados além do
          necessário (art. 14, § 4º), e o responsável pode pedir a qualquer momento a informação
          sobre quais dados do menor tratamos, bem como sua eliminação.
        </p>
      </section>

      <section>
        <h2>6. Com quem compartilhamos</h2>
        <p>
          Não vendemos dados pessoais e não os compartilhamos com terceiros para publicidade. O
          compartilhamento se limita aos operadores que executam o serviço em nosso nome (art. 5º,
          VII, da LGPD), sob contrato e sem autonomia sobre os dados:
        </p>
        <ul>
          <li>
            <b>Netlify</b> — hospedagem do site, autenticação das contas e armazenamento dos
            arquivos e registros da plataforma;
          </li>
          <li>
            <b>Resend</b> — envio dos e-mails transacionais (correção pronta, novo material,
            lembretes).
          </li>
        </ul>
        <p>
          Além disso, dados podem ser fornecidos a autoridades diante de ordem judicial ou requisição
          legal, e usados na defesa de direitos em processo judicial, administrativo ou arbitral —
          hipóteses do art. 7º, II e VI, da LGPD.
        </p>
      </section>

      <section>
        <h2>7. Transferência internacional</h2>
        <p>
          Os operadores acima mantêm servidores fora do Brasil, o que caracteriza transferência
          internacional de dados. Ela é feita com apoio no art. 33, II, da LGPD, mediante as
          cláusulas contratuais de proteção de dados oferecidas por esses fornecedores, e sempre
          limitada ao necessário para prestar o serviço.
        </p>
      </section>

      <section>
        <h2>8. Por quanto tempo guardamos</h2>
        <ul>
          <li>
            <b>Dados de cadastro e acadêmicos:</b> enquanto a matrícula estiver ativa e por até 5
            (cinco) anos após o encerramento, prazo prescricional do art. 27 do Código de Defesa do
            Consumidor, para defesa em eventual discussão sobre o serviço prestado.
          </li>
          <li>
            <b>Registros de acesso à aplicação:</b> 6 (seis) meses, sob sigilo e em ambiente
            controlado, conforme o art. 15 do Marco Civil da Internet.
          </li>
          <li>
            <b>Mensagens do formulário de contato:</b> até 12 meses, ou até você pedir a exclusão.
          </li>
          <li>
            <b>Registros fiscais e contábeis:</b> pelos prazos da legislação tributária.
          </li>
        </ul>
        <p>
          Encerrado o prazo, os dados são eliminados, salvo nas hipóteses de conservação autorizadas
          pelo art. 16 da LGPD.
        </p>
      </section>

      <section>
        <h2>9. Segurança</h2>
        <p>
          Adotamos as medidas técnicas e administrativas exigidas pelos arts. 46 a 49 da LGPD para
          proteger os dados de acesso não autorizado, perda, alteração ou divulgação indevida.
          Entre elas:
        </p>
        <ul>
          <li>tráfego cifrado por HTTPS em todo o site e cabeçalhos de segurança no servidor;</li>
          <li>senhas guardadas apenas como resumo criptográfico, nunca em texto legível;</li>
          <li>verificação de permissão no servidor a cada operação que toca dado de aluno;</li>
          <li>uma sessão ativa por conta e limites de uso contra acesso automatizado;</li>
          <li>acesso administrativo restrito à professora e à equipe autorizada.</li>
        </ul>
        <p>
          Nenhum sistema é infalível. Se ocorrer incidente de segurança capaz de gerar risco ou dano
          relevante, comunicaremos você e a ANPD no prazo e na forma da regulamentação editada com
          base no art. 48 da LGPD.
        </p>
      </section>

      <section>
        <h2>10. Cookies e armazenamento no navegador</h2>
        <p>
          Usamos apenas o armazenamento estritamente necessário para o funcionamento da plataforma:
          manter você conectado, lembrar o aparelho autorizado e guardar preferências simples de
          navegação.
        </p>
        <p>
          <b>Não usamos cookies de publicidade, de perfilamento nem ferramentas de análise de
          audiência de terceiros.</b> Bloquear esse armazenamento no navegador impede o login na
          área do aluno.
        </p>
      </section>

      <section>
        <h2>11. Seus direitos</h2>
        <p>
          O art. 18 da LGPD garante a você confirmação, acesso, correção, anonimização ou eliminação,
          portabilidade, informação sobre compartilhamento e revogação do consentimento. Cada um
          deles, com o passo a passo para exercê-los e os prazos de resposta, está detalhado na
          página <a href="/lgpd">LGPD e seus direitos</a>.
        </p>
      </section>

      <section>
        <h2>12. Alterações desta política</h2>
        <p>
          Esta política pode ser atualizada quando o serviço ou a legislação mudarem. A versão
          vigente é sempre a publicada nesta página, com a data de vigência indicada no topo.
          Mudanças relevantes são avisadas na plataforma antes de entrar em vigor.
        </p>
      </section>
    </PaginaLegal>
  )
}
