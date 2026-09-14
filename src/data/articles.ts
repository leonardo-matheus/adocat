export type Article = {
    slug: string;
    category: string;
    title: string;
    excerpt: string;
    image: string;
    readTime: string;
    sections: { title: string; text: string }[];
};

export const articles: Article[] = [
    {
        slug: 'primeiros-dias-em-casa',
        category: 'ADOÇÃO RESPONSÁVEL',
        title: 'Um novo lar, no tempo dele.',
        excerpt:
            'Pequenos cuidados que fazem toda a diferença nos primeiros dias depois da adoção.',
        image: '/images/luna.jpg',
        readTime: '4 min de leitura',
        sections: [
            {
                title: 'Prepare um cantinho seguro',
                text: 'Separe um ambiente tranquilo com água fresca, alimento adequado, caminha e caixa de areia. Mantenha água e comida afastadas da caixa. Antes da chegada, confira telas nas janelas e feche rotas de fuga. Para cães, organize também os horários de passeio e um espaço de descanso.',
            },
            {
                title: 'Deixe que ele se aproxime',
                text: 'Cada animal se adapta em um ritmo. Alguns exploram a casa no primeiro dia; outros precisam de mais tempo. Evite forçar colo, apresentar muitas pessoas ou fazer mudanças bruscas na rotina. Converse em voz baixa e ofereça brincadeiras respeitando os sinais de desconforto.',
            },
            {
                title: 'Apresente outros animais aos poucos',
                text: 'Comece com ambientes separados e trocas de cheiros. As primeiras interações devem ser breves e supervisionadas, com recursos suficientes para cada animal. Se houver conflito, volte uma etapa e procure orientação profissional. Nunca deixe os animais juntos sem supervisão antes de uma adaptação segura.',
            },
            {
                title: 'Conte com apoio veterinário',
                text: 'Agende uma avaliação para revisar vacinação, alimentação e prevenção de parasitas. Falta de apetite, apatia ou alterações persistentes merecem atenção veterinária. A adaptação continua depois dos primeiros dias: mantenha contato com a equipe responsável pela adoção.',
            },
        ],
    },
    {
        slug: 'casa-segura-para-gatos',
        category: 'BEM-ESTAR',
        title: 'Casa segura, gato feliz.',
        excerpt: 'Telas, plantas e janelas: um guia para preparar seu espaço para um novo amigo.',
        image: '/images/romeu.jpg',
        readTime: '3 min de leitura',
        sections: [
            {
                title: 'Proteja todas as saídas',
                text: 'Instale telas apropriadas em janelas, sacadas e áreas com risco de queda ou fuga. Mosquiteiros comuns não substituem redes próprias para proteção animal. Revise regularmente a fixação e o estado do material, inclusive em casas térreas.',
            },
            {
                title: 'Olhe para a casa na altura do gato',
                text: 'Guarde produtos de limpeza, medicamentos, linhas, elásticos e pequenos objetos. Verifique plantas potencialmente tóxicas com um veterinário; lírios, por exemplo, representam perigo grave para gatos. Mantenha máquinas de lavar e armários fechados e confira o interior antes de usar.',
            },
            {
                title: 'Enriqueça o ambiente',
                text: 'Ofereça arranhadores firmes, esconderijos, pontos elevados seguros e brincadeiras supervisionadas. Distribua água em mais de um local. Um ambiente previsível, com oportunidades para explorar, descansar e brincar, contribui para o bem-estar.',
            },
        ],
    },
    {
        slug: 'castracao-e-cuidado',
        category: 'SAÚDE ANIMAL',
        title: 'Castrar também é cuidar.',
        excerpt:
            'Entenda como a castração faz parte de uma vida com mais cuidado e responsabilidade.',
        image: '/images/castiel.jpg',
        readTime: '3 min de leitura',
        sections: [
            {
                title: 'Cuidado individual e coletivo',
                text: 'A castração ajuda a prevenir ninhadas não planejadas e contribui para o controle populacional. Os benefícios e riscos para cada animal dependem de fatores como espécie, idade e condições de saúde, e devem ser discutidos com um médico-veterinário.',
            },
            {
                title: 'Planeje com orientação',
                text: 'O veterinário define o momento adequado, a avaliação pré-operatória e os cuidados necessários. Não existe uma recomendação única que substitua a consulta. Siga somente as instruções da equipe para alimentação, jejum e medicamentos.',
            },
            {
                title: 'A recuperação também precisa de carinho',
                text: 'Reserve um lugar limpo e tranquilo, limite atividades conforme a orientação recebida e proteja a região operada. Observe mudanças na ferida, dor, falta de apetite ou prostração e contate o veterinário. Nunca administre medicamentos por conta própria.',
            },
        ],
    },
];
