# Guia do painel AdoCat

Abra `/admin` (no GitHub Pages, `/#/admin`) e entre com a conta da equipe. A demonstração usa `demo@adocat.org` e `adocat-demo`; na API, a conta é configurada no servidor.

## Rotina de edição

1. Em **Conteúdo do site**, escolha a página e edite os campos. Cada imagem tem um endereço e uma descrição; cada chamada tem texto e destino.
2. Use **Salvar rascunho** para guardar o trabalho. O site público continua exibindo a última publicação.
3. Abra **Ver prévia** para navegar pelo rascunho autenticado. A faixa superior identifica a prévia e permite voltar ao painel ou ver a versão publicada.
4. Revise textos, imagens e destinos e clique em **Publicar alterações**. A publicação inclui o documento completo: páginas, menu, artigos e integrações.

Descartar o rascunho recupera a última versão publicada. Se outra aba ou pessoa editar primeiro, o painel recusa a gravação desatualizada: recarregue e reaplique suas mudanças. Não há histórico de versões anteriores; mantenha backups do banco e das imagens.

## O que cada área gerencia

| Área             | Uso                                                                             |
| ---------------- | ------------------------------------------------------------------------------- |
| Visão geral      | Resumo de animais, candidaturas, voluntários e campanhas                        |
| Animais          | Fotos, história, saúde, características e disponibilidade                       |
| Triagens         | Candidaturas e etapas de atendimento                                            |
| Voluntários      | Contatos, interesses e status do cadastro                                       |
| Campanhas        | Fotos, metas, arrecadação informada pela equipe e status                        |
| Conteúdo do site | Identidade, capa, textos das páginas, imagens, legendas e chamadas              |
| Artigos          | Endereço, capa, resumo, categoria e blocos de texto                             |
| Mídias           | Upload, cadastro por URL, nome, descrição e reutilização de imagens             |
| Menus e botões   | Ordem, visibilidade, nome e destino dos links de navegação                      |
| Integrações      | WhatsApp, e-mail, redes sociais, PIX e disponibilidade dos serviços do servidor |

Os cadastros operacionais (animais, triagens, voluntários, campanhas e biblioteca de mídias) são salvos diretamente. O fluxo de rascunho e publicação se aplica ao conteúdo institucional, menu, artigos e integrações.

## Imagens e acessibilidade

Use JPG, PNG ou WebP de até 3 MB. Prefira arquivos otimizados: uma imagem de capa com cerca de 1600 pixels de largura costuma ser suficiente. Descreva o que a imagem comunica; a descrição ajuda quem utiliza leitor de tela. As imagens iniciais são ilustrativas.

Na API, uploads usam o bucket R2 configurado no servidor. Também é possível cadastrar uma URL pública existente. Remover um item da biblioteca não apaga o arquivo do bucket nem o retira automaticamente das páginas que já usam seu endereço.

## Integrações

**WhatsApp e redes sociais:** informe os contatos oficiais. O WhatsApp usa país, DDD e número, somente com dígitos, por exemplo `5516997587596`. Os botões abrem o canal de contato; o sistema não envia mensagens automaticamente pelo WhatsApp.

**PIX:** informe chave, nome do beneficiário e cidade, e publique. Confira os dados com a organização antes de compartilhar. O site gera QR Code e código copia e cola para a contribuição escolhida; a confirmação e a atualização da arrecadação continuam manuais.

Antes da primeira publicação do CMS, a API pode usar os dados de PIX do ambiente do servidor. Preencha esses dados também no painel antes de publicar: a partir da primeira publicação, a configuração do CMS passa a valer. Apagar a chave no painel e publicar desativa o PIX no site.

**E-mail:** o endereço público é editável no painel. As notificações de formulários usam SMTP e os destinatários privados configurados no backend. Alterar o e-mail de contato não altera a senha ou o destinatário interno de notificações.

**Armazenamento e SMTP:** o painel informa se as variáveis necessárias estão preenchidas. Esse estado não é um teste de conexão nem comprova entrega de e-mail. Chaves R2, senhas SMTP e credenciais administrativas ficam exclusivamente no `.env` privado do servidor.

## Demonstração e produção

O GitHub Pages executa a demonstração estática. As alterações ficam apenas no navegador e não são publicadas para outros visitantes. Publicar conteúdo no painel não altera o repositório GitHub nem faz um novo deploy. Evite dados pessoais reais nesse modo.

Para gestão compartilhada, hospede a [API PHP](https://github.com/leonardo-matheus/adocat-backend), execute as migrações, configure os serviços e gere o frontend com `VITE_DATA_MODE=api` e `VITE_API_URL` apontando para ela. A implantação preferida serve frontend e `/api` na mesma origem. Consulte os READMEs dos dois repositórios para banco, cookies, CORS, HTTPS e configuração de hospedagem.
