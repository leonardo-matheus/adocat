import { ArrowLeft, Mail, ShieldCheck } from 'lucide-react';
import { Link } from 'react-router-dom';
import { isDemoMode } from '../lib/api';

export default function Privacy() {
    return (
        <div className="privacy-page">
            <div className="container privacy-shell">
                <Link className="back-link" to="/">
                    <ArrowLeft size={17} /> Voltar ao site
                </Link>
                <header>
                    <div className="privacy-icon">
                        <ShieldCheck />
                    </div>
                    <span className="eyebrow">Privacidade e transparência</span>
                    <h1>Seus dados merecem cuidado.</h1>
                    <p>
                        Esta página explica, em linguagem simples, como os dados informados nos
                        formulários da AdoCat podem ser usados.
                    </p>
                </header>
                {isDemoMode && (
                    <div className="privacy-demo">
                        <strong>Ambiente de demonstração</strong>
                        <p>
                            Os cadastros feitos aqui são apenas dados de teste guardados localmente
                            para demonstrar o funcionamento. Eles não são enviados à ONG. Evite
                            inserir dados pessoais reais.
                        </p>
                    </div>
                )}
                <article className="privacy-content">
                    <section>
                        <h2>Quais dados são coletados</h2>
                        <p>
                            Nos formulários de adoção e voluntariado, podem ser solicitados nome,
                            e-mail, telefone, cidade, informações sobre moradia, rotina,
                            disponibilidade e interesses. No painel restrito, também são tratados
                            dados necessários à gestão dos animais, campanhas e inscrições.
                        </p>
                    </section>
                    <section>
                        <h2>Por que esses dados são usados</h2>
                        <p>
                            Os dados servem para avaliar a compatibilidade e a segurança de uma
                            adoção, organizar o contato com voluntários, responder às solicitações e
                            administrar as atividades da ONG. O tratamento deve se limitar a essas
                            finalidades.
                        </p>
                    </section>
                    <section>
                        <h2>Compartilhamento e proteção</h2>
                        <p>
                            Os dados não devem ser comercializados. O acesso deve ficar limitado às
                            pessoas autorizadas da AdoCat e aos fornecedores técnicos necessários
                            para operar a plataforma, sujeitos a medidas de segurança e
                            confidencialidade.
                        </p>
                    </section>
                    <section>
                        <h2>Seus direitos pela LGPD</h2>
                        <p>
                            Você pode pedir confirmação do tratamento, acesso, correção, informação
                            sobre compartilhamento, eliminação quando aplicável ou revogação do
                            consentimento. Alguns registros podem precisar ser mantidos quando
                            houver obrigação legal ou outra base legítima.
                        </p>
                    </section>
                    <section>
                        <h2>Retenção e versão desta política</h2>
                        <p>
                            Os prazos de retenção, responsáveis formais, fornecedores e
                            procedimentos de atendimento deverão ser definidos pela AdoCat antes da
                            publicação em produção. Esta versão é um texto inicial para validação
                            jurídica e operacional.
                        </p>
                    </section>
                    <section className="privacy-contact">
                        <Mail />
                        <div>
                            <h2>Fale sobre seus dados</h2>
                            <p>
                                Para dúvidas ou solicitações, entre em contato pelo e-mail{' '}
                                <a href="mailto:adocat.adocao@gmail.com">adocat.adocao@gmail.com</a>
                                .
                            </p>
                        </div>
                    </section>
                </article>
            </div>
        </div>
    );
}
