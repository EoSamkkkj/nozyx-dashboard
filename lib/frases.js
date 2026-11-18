// Frase do dia para o editor: versículos e frases conhecidas, cada uma com o porquê.
// Muda uma vez por dia (mesma frase o dia inteiro, em qualquer aparelho).

export const FRASES = [
  { t: 'Tudo posso naquele que me fortalece.', f: 'Filipenses 4:13', p: 'Nos dias pesados, a força não precisa vir só de você. Respira e faz o próximo corte.' },
  { t: 'Seja forte e corajoso. Não tenha medo, nem desanime.', f: 'Josué 1:9', p: 'Projeto difícil não é sinal de que você não consegue. É o treino que te leva ao próximo nível.' },
  { t: 'Tudo o que fizerem, façam de todo o coração, como para o Senhor.', f: 'Colossenses 3:23', p: 'Cada vídeo bem feito é sua assinatura. Capricho é o que faz o cliente voltar.' },
  { t: 'Não nos cansemos de fazer o bem, pois no tempo certo colheremos, se não desanimarmos.', f: 'Gálatas 6:9', p: 'O resultado nem sempre vem no mesmo dia do esforço. Continua plantando.' },
  { t: 'Os planos do diligente conduzem à fartura.', f: 'Provérbios 21:5', p: 'Organizar as entregas e cumprir prazo é o que transforma trabalho em renda fixa.' },
  { t: 'Entregue ao Senhor o seu caminho, confie nele, e ele agirá.', f: 'Salmos 37:5', p: 'Faz a sua parte bem feita hoje e solta a ansiedade do resto.' },
  { t: 'Os que esperam no Senhor renovam as suas forças.', f: 'Isaías 40:31', p: 'Cansaço passa. Descansa quando precisar, mas não desiste.' },
  { t: 'Em todo trabalho há proveito.', f: 'Provérbios 14:23', p: 'Até o vídeo mais simples te deixa mais rápido e melhor para o próximo.' },
  { t: 'Quem é fiel no pouco também é fiel no muito.', f: 'Lucas 16:10', p: 'O cliente pequeno de hoje é a indicação grande de amanhã. Trata todo projeto com o mesmo carinho.' },
  { t: 'Este é o dia que o Senhor fez; alegremo-nos e exultemos nele.', f: 'Salmos 118:24', p: 'Hoje é mais uma chance de criar algo que ninguém mais faria do seu jeito.' },
  { t: 'Não temas, porque eu sou contigo.', f: 'Isaías 41:10', p: 'Prazo apertado e cliente exigente assustam, mas você já passou por coisa pior.' },
  { t: 'O coração do homem planeja o seu caminho, mas o Senhor lhe dirige os passos.', f: 'Provérbios 16:9', p: 'Planeja o dia, mas não trava se algo mudar. Ajusta e segue.' },
  { t: 'Tudo tem o seu tempo determinado.', f: 'Eclesiastes 3:1', p: 'Tem época de muita venda e época mais calma. Use a calma para estudar e melhorar.' },
  { t: 'Melhor é o fim das coisas do que o seu princípio.', f: 'Eclesiastes 7:8', p: 'Começar é fácil; o mérito está em entregar. Termina o que você começou hoje.' },
  { t: 'A mão dos diligentes enriquece.', f: 'Provérbios 10:4', p: 'Constância vence talento que não aparece para trabalhar.' },
  { t: 'Sede fortes, e revigore-se o vosso coração.', f: 'Salmos 31:24', p: 'Um dia ruim não define sua carreira. Amanhã o editor que levanta é mais experiente.' },
  { t: 'Pedi, e dar-se-vos-á; buscai, e achareis.', f: 'Mateus 7:7', p: 'Cliente novo não cai do céu: mostra seu trabalho, manda mensagem, oferece.' },
  { t: 'O Senhor é a minha força e o meu escudo.', f: 'Salmos 28:7', p: 'Trabalha com a cabeça tranquila: você não está sozinho nessa.' },
  { t: 'Não desprezes os pequenos começos.', f: 'Zacarias 4:10', p: 'Todo grande editor começou cortando vídeo simples. Você está construindo algo.' },
  { t: 'Aquele que começou a boa obra em vós há de completá-la.', f: 'Filipenses 1:6', p: 'O que você está construindo com a Nozyx tem futuro. Continua.' },

  { t: 'Feito é melhor que perfeito.', f: 'ditado popular', p: 'O vídeo entregue paga as contas; o perfeito na gaveta não. Entrega e melhora no próximo.' },
  { t: 'Disciplina é fazer o que precisa ser feito, mesmo sem vontade.', f: 'frase popular', p: 'Motivação vai e vem. O hábito de sentar e editar é o que te sustenta.' },
  { t: 'Um passo de cada vez ainda é andar para frente.', f: 'frase popular', p: 'Projeto grande assusta. Quebra em cenas e faz uma de cada vez.' },
  { t: 'O sucesso é a soma de pequenos esforços repetidos dia após dia.', f: 'Robert Collier', p: 'Cada venda de hoje entra no gráfico. É assim que o mês fica bonito.' },
  { t: 'A melhor maneira de prever o futuro é criá-lo.', f: 'Peter Drucker', p: 'A previsão do mês está no painel, mas quem muda o número é você.' },
  { t: 'Não pare quando estiver cansado. Pare quando tiver terminado.', f: 'frase popular', p: 'Termina a etapa que começou, aí sim descansa com a cabeça leve.' },
  { t: 'Quem faz o que ama nunca trabalha um dia sequer.', f: 'ditado popular', p: 'Lembra por que você começou a editar. Esse gosto é sua vantagem.' },
  { t: 'Grandes coisas nunca vêm de zonas de conforto.', f: 'frase popular', p: 'Tenta aquele efeito novo, aquele estilo diferente. É assim que o portfólio cresce.' },
  { t: 'A persistência realiza o impossível.', f: 'provérbio chinês', p: 'Mês fraco não é o fim. Quem continua aparecendo colhe no mês seguinte.' },
  { t: 'O segredo de progredir é começar.', f: 'atribuída a Mark Twain', p: 'Abre o projeto e faz o primeiro corte. O resto vem.' },
  { t: 'Faça hoje o que outros não querem, e amanhã viverá como outros não podem.', f: 'frase popular', p: 'A hora a mais de hoje é a liberdade que você vai ter depois.' },
  { t: 'Qualidade é fazer certo quando ninguém está olhando.', f: 'atribuída a Henry Ford', p: 'O detalhe que só você percebe é o que faz o vídeo parecer profissional.' },
  { t: 'Sonhos não funcionam a menos que você trabalhe.', f: 'frase popular', p: 'A meta do mês só fecha com vídeo entregue. Bora.' },
  { t: 'Seja tão bom que não possam te ignorar.', f: 'Steve Martin', p: 'Indicação é o melhor marketing de um editor. Ela vem de trabalho impecável.' },
  { t: 'Cai sete vezes, levanta oito.', f: 'provérbio japonês', p: 'Cliente que reclamou, render que travou: faz parte. Levanta e ajusta.' },
  { t: 'O começo é a parte mais importante do trabalho.', f: 'Platão', p: 'Os primeiros minutos do dia definem o ritmo. Começa pelo mais importante.' },
  { t: 'Coragem é agir mesmo com medo.', f: 'frase popular', p: 'Cobrar o preço justo e oferecer seu trabalho dá medo. Faz assim mesmo.' },
  { t: 'Quem planta com constância colhe com abundância.', f: 'frase popular', p: 'Postar, prospectar e entregar todo dia: é isso que enche o gráfico.' },
  { t: 'Você não precisa ser grande para começar, mas precisa começar para ser grande.', f: 'atribuída a Zig Ziglar', p: 'Cada projeto de hoje é degrau. Não espera o momento perfeito.' },
  { t: 'Descansar também faz parte do trabalho.', f: 'frase popular', p: 'Editor esgotado erra mais. Pausa curta, água e volta com o olho fresco.' },
];

/** Mesma frase para o dia inteiro: escolhe pelo número do dia. */
export function fraseDoDia(today) {
  const [y, m, d] = today.split('-').map(Number);
  const n = Math.floor(Date.UTC(y, m - 1, d) / 864e5);
  return FRASES[((n * 7) % FRASES.length + FRASES.length) % FRASES.length];
}
