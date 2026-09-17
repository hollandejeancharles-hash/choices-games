import type { Axis, Localized, Question, Theme, Weights } from "../core/types";
const l = (fr: string, en: string): Localized => ({ fr, en });
function q(
  id: string,
  theme: Theme,
  axis: Axis,
  prompt: Localized,
  a: Localized,
  b: Localized,
  extraA: Weights = {},
  extraB: Weights = {},
  pairId?: string,
): Question {
  return {
    id,
    theme,
    prompt,
    options: [
      { text: a, weights: { [axis]: 3, ...extraA } },
      { text: b, weights: { [axis]: -3, ...extraB } },
    ],
    ...(pairId ? { consistency: { pairId, axis } } : {}),
  };
}
/** Positive poles: adventure, reason, independence, future, structure, ambition.
 * Weights describe the tension in this fictional situation, never moral worth.
 * A/B positions are shuffled by the UI, independently of scoring indices.
 */
export const questions: Question[] = [
  q(
    "r01",
    "ethics",
    "reason",
    l(
      "Une bombe menace 3 000 personnes dans un centre commercial. Dans ce scénario, accuser un innocent garantit leur survie, mais le condamne à la prison à vie. Refuser entraîne la mort des 3 000 personnes. Que choisis-tu ?",
      "A bomb threatens 3,000 people in a shopping mall. In this thought experiment, framing an innocent person guarantees everyone survives, but sends that person to prison for life. Refusing means all 3,000 die. What do you choose?",
    ),
    l(
      "Accuser l'innocent pour sauver les 3 000 vies, et porter cette injustice.",
      "Frame the innocent person to save 3,000 lives, and live with that injustice.",
    ),
    l(
      "Refuser de condamner un innocent, malgré les 3 000 vies perdues.",
      "Refuse to condemn an innocent person, despite the 3,000 lives lost.",
    ),
    {},
    { structure: 1 },
    "consequences",
  ),
  q(
    "r02",
    "work",
    "reason",
    l(
      "Une coopérative doit supprimer cinq postes ou fermer dans un mois, laissant cinquante personnes sans emploi. Les cinq concernés sont tes amis. Tu as la décision finale.",
      "A worker-owned business must cut five jobs or close next month, leaving fifty people out of work. The five affected are your friends. The final decision is yours.",
    ),
    l(
      "Supprimer les cinq postes pour préserver les autres, malgré leur confiance en moi.",
      "Cut the five jobs to protect the others, despite their trust in me.",
    ),
    l(
      "Garder tout le monde jusqu'au bout, en partageant le risque de fermeture.",
      "Keep everyone until the end and share the risk of closure.",
    ),
    { future: 1 },
    { independence: -1 },
    "consequences",
  ),
  q(
    "r03",
    "relationships",
    "reason",
    l(
      "Ton meilleur ami a triché pour obtenir une bourse dont il a besoin. La révélation rendrait sa place au candidat lésé, mais ton ami abandonnerait ses études.",
      "Your closest friend cheated to win a scholarship they desperately need. Exposing it would restore the rightful winner's place, but your friend would have to drop out.",
    ),
    l(
      "Révéler la fraude et rendre la bourse au candidat lésé.",
      "Expose the cheating and return the scholarship to its rightful winner.",
    ),
    l(
      "Protéger mon ami en laissant l'autre candidat subir l'injustice.",
      "Protect my friend while letting the other applicant bear the injustice.",
    ),
    { structure: 1 },
    {},
  ),
  q(
    "r04",
    "powers",
    "reason",
    l(
      "Tu peux effacer le deuil d'un proche. Il retrouvera la paix, mais perdra aussi tous les souvenirs heureux de la personne disparue. Il t'a confié ce choix.",
      "You can erase a loved one's grief. They would find peace, but lose every happy memory of the person who died. They have entrusted the choice to you.",
    ),
    l(
      "Effacer la douleur, même au prix de ces souvenirs.",
      "Remove the pain, even at the cost of those memories.",
    ),
    l(
      "Préserver les souvenirs, avec la douleur qui les accompagne.",
      "Preserve the memories, along with the pain they carry.",
    ),
  ),
  q(
    "r05",
    "travel",
    "reason",
    l(
      "Après une inondation, ton véhicule peut ramener ton frère isolé ou quatre inconnus isolés ailleurs. Un seul trajet est possible avant la fermeture de la route.",
      "After a flood, your vehicle can collect your stranded brother or four strangers stranded elsewhere. There is time for just one trip before the road closes.",
    ),
    l(
      "Ramener les quatre inconnus et laisser mon frère attendre sans garantie.",
      "Collect the four strangers and leave my brother waiting without guarantees.",
    ),
    l(
      "Ramener mon frère et laisser les quatre inconnus attendre sans garantie.",
      "Collect my brother and leave the four strangers waiting without guarantees.",
    ),
  ),
  q(
    "r06",
    "everyday",
    "reason",
    l(
      "Ton refuge peut soigner un chien auquel toute l'équipe est attachée, ou vacciner cent animaux avec la même somme. Sans soin, le chien ne survivra pas.",
      "Your shelter can treat one dog the whole team loves, or vaccinate a hundred animals with the same money. Without treatment, the dog will not survive.",
    ),
    l(
      "Financer les cent vaccins et renoncer au traitement du chien.",
      "Fund the hundred vaccinations and forgo the dog's treatment.",
    ),
    l(
      "Soigner le chien et renoncer aux cent vaccinations.",
      "Treat the dog and forgo the hundred vaccinations.",
    ),
  ),
  q(
    "r07",
    "absurd",
    "reason",
    l(
      "Une machine rend mille inconnus heureux pour un an, mais te retire une amitié précieuse : vous ne vous reconnaîtrez plus. Tu es seul à pouvoir l'activer.",
      "A machine gives a thousand strangers a happy year, but takes away one treasured friendship: you will no longer recognise each other. Only you can switch it on.",
    ),
    l(
      "L'activer et perdre cette amitié pour leur bonheur.",
      "Switch it on and lose that friendship for their happiness.",
    ),
    l(
      "Garder cette amitié et renoncer au bonheur offert aux mille inconnus.",
      "Keep the friendship and give up the happiness offered to a thousand strangers.",
    ),
  ),
  q(
    "r08",
    "ethics",
    "reason",
    l(
      "Une preuve innocente ton parent d'une accusation. Elle révèle aussi la faute grave d'une personne qui t'a sauvé la vie et qui serait emprisonnée. Tu ne peux pas dissocier les deux.",
      "One piece of evidence clears your parent of an accusation. It also reveals a serious offence by the person who saved your life, who would be imprisoned. The two cannot be separated.",
    ),
    l(
      "Transmettre la preuve complète, même contre la personne qui m'a sauvé.",
      "Submit the full evidence, even against the person who saved me.",
    ),
    l(
      "La retenir par loyauté, en laissant mon parent accusé.",
      "Withhold it out of loyalty, leaving my parent accused.",
    ),
    { structure: 1 },
    {},
  ),
  q(
    "r09",
    "relationships",
    "reason",
    l(
      "Un ami te demande un avis sincère sur le projet auquel il a consacré dix ans. Tu sais qu'il échouera ; il doit présenter le projet demain et ne peut plus le modifier.",
      "A friend asks for your honest view of a project they spent ten years on. You know it will fail; they present it tomorrow and can no longer change it.",
    ),
    l(
      "Dire ce que je pense, quitte à briser son élan avant la présentation.",
      "Tell them what I think, even if it destroys their confidence before the pitch.",
    ),
    l(
      "L'encourager pour préserver sa confiance, en lui cachant mon avis.",
      "Encourage them to protect their confidence, while hiding my real opinion.",
    ),
  ),
  q(
    "r10",
    "work",
    "reason",
    l(
      "Tu gères un fonds d'urgence. Un dossier anonyme répond mieux aux critères qu'un dossier porté par une famille que tu connais et dont tu vois la détresse. Une seule aide reste.",
      "You manage an emergency fund. An anonymous application meets the criteria better than one from a family you know whose distress you see every day. One grant remains.",
    ),
    l(
      "Suivre les critères et refuser la famille que je connais.",
      "Follow the criteria and turn down the family I know.",
    ),
    l(
      "Aider la famille que je connais et déroger aux critères communs.",
      "Help the family I know and make an exception to the shared criteria.",
    ),
    { structure: 1 },
    {},
  ),
  q(
    "a01",
    "travel",
    "adventure",
    l(
      "En montagne, un membre du groupe manque à l'appel. Partir le chercher t'expose à une tempête ; rester assure ta sécurité mais retarde son secours de plusieurs heures.",
      "A member of your hiking group is missing. Searching exposes you to an incoming storm; staying keeps you safe but delays help for several hours.",
    ),
    l(
      "Partir chercher la personne en acceptant de me mettre en danger.",
      "Go looking, accepting the danger to myself.",
    ),
    l(
      "Rester à l'abri et attendre les secours, malgré le délai.",
      "Stay sheltered and wait for rescuers, despite the delay.",
    ),
    {},
    {},
    "risk",
  ),
  q(
    "a02",
    "work",
    "adventure",
    l(
      "Tu peux témoigner publiquement d'une injustice au travail. Ton témoignage a une chance sur deux de la faire cesser, mais tu perdras certainement ton emploi. Le silence protège ton revenu.",
      "You can speak publicly about an injustice at work. Your testimony has a fifty-fifty chance of ending it, but will certainly cost you your job. Silence protects your income.",
    ),
    l(
      "Témoigner et perdre mon revenu pour cette chance de changement.",
      "Speak out and lose my income for that chance of change.",
    ),
    l(
      "Garder mon emploi et laisser cette injustice sans mon témoignage.",
      "Keep my job and leave the injustice without my testimony.",
    ),
    {},
    {},
    "risk",
  ),
  q(
    "a03",
    "powers",
    "adventure",
    l(
      "Tu peux tester un pouvoir qui guérit une maladie : une chance sur deux de guérir, une chance sur deux d'aggraver ton état. Sans le test, ton état reste stable mais limitant.",
      "You can test a healing power: a fifty-fifty chance of recovery or of getting worse. Without it, your condition stays stable but limiting.",
    ),
    l(
      "Tenter la guérison en acceptant le risque d'aggravation.",
      "Try for recovery, accepting the risk of getting worse.",
    ),
    l(
      "Garder mon état stable et renoncer à cette chance de guérison.",
      "Keep my stable condition and give up this chance of recovery.",
    ),
  ),
  q(
    "a04",
    "relationships",
    "adventure",
    l(
      "Avouer tes sentiments pourrait transformer une amitié essentielle en histoire d'amour. L'autre t'a dit qu'un amour non partagé mettrait fin à votre proximité.",
      "Confessing your feelings could turn an essential friendship into a relationship. The other person has said unreturned feelings would end your closeness.",
    ),
    l(
      "Avouer mes sentiments au risque de perdre notre proximité.",
      "Confess, risking the closeness we already have.",
    ),
    l(
      "Préserver l'amitié et renoncer à savoir si cet amour est partagé.",
      "Protect the friendship and give up knowing whether the feeling is mutual.",
    ),
  ),
  q(
    "a05",
    "everyday",
    "adventure",
    l(
      "Tu peux placer toutes tes économies dans le commerce d'un ami : il pourrait sauver son emploi et doubler ta mise, mais une faillite vous laisserait tous deux sans réserve.",
      "You can put all your savings into a friend's shop: it could save their job and double your money, but failure would leave you both without a safety net.",
    ),
    l(
      "Investir mes économies et partager le risque avec lui.",
      "Invest my savings and share the risk with them.",
    ),
    l(
      "Conserver ma réserve en le laissant chercher une solution incertaine.",
      "Keep my safety net and leave them to seek an uncertain alternative.",
    ),
    { independence: -1 },
    {},
  ),
  q(
    "a06",
    "ethics",
    "adventure",
    l(
      "Des documents pourraient disculper un inconnu emprisonné. Les publier révèle aussi ton identité à des personnes qui te menacent. Les garder secrets te protège, mais son recours échoue.",
      "Documents could clear an imprisoned stranger. Publishing them also exposes your identity to people threatening you. Keeping them secret protects you, but their appeal fails.",
    ),
    l(
      "Publier les documents malgré les menaces contre moi.",
      "Publish the documents despite the threats to me.",
    ),
    l(
      "Me protéger en renonçant à les publier.",
      "Protect myself by withholding them.",
    ),
  ),
  q(
    "a07",
    "absurd",
    "adventure",
    l(
      "Une porte mène à une société sans faim. Tu peux y emmener dix volontaires, mais personne ne saura revenir. Rester vous laisse dans un village qui manque de nourriture.",
      "A doorway leads to a society without hunger. You can take ten willing volunteers, but nobody knows how to return. Staying leaves you in a village short of food.",
    ),
    l(
      "Franchir la porte avec eux sans possibilité connue de retour.",
      "Step through with them, with no known way back.",
    ),
    l(
      "Rester dans notre monde malgré les pénuries.",
      "Stay in our world despite the shortages.",
    ),
  ),
  q(
    "a08",
    "travel",
    "adventure",
    l(
      "Ton bateau reçoit un appel de détresse. Faire le détour épuise votre réserve de carburant et menace votre retour ; continuer abandonne l'autre équipage à une attente incertaine.",
      "Your boat receives a distress call. Diverting uses your fuel reserve and puts your return at risk; continuing leaves the other crew waiting for uncertain help.",
    ),
    l(
      "Faire le détour au risque de compromettre notre retour.",
      "Divert, risking our own return.",
    ),
    l(
      "Préserver notre carburant et poursuivre notre route.",
      "Keep our fuel reserve and continue on course.",
    ),
  ),
  q(
    "a09",
    "work",
    "adventure",
    l(
      "Une petite équipe te propose de développer une invention utile mais incertaine. Pour la rejoindre, tu dois quitter un poste stable qui finance l'aide que tu apportes à tes proches.",
      "A small team asks you to develop a useful but uncertain invention. Joining means leaving the stable job that funds your support for loved ones.",
    ),
    l(
      "Rejoindre le projet en réduisant l'aide garantie à mes proches.",
      "Join the project, reducing the support I can guarantee my loved ones.",
    ),
    l(
      "Garder mon poste et renoncer à participer à cette invention.",
      "Keep my job and give up my role in the invention.",
    ),
    { future: 1 },
    { independence: -1 },
  ),
  q(
    "a10",
    "relationships",
    "adventure",
    l(
      "Ton partenaire veut reconstruire votre vie à l'étranger. Le suivre pourrait sauver votre couple mais te prive de ton réseau ; rester préserve tes appuis et met fin au couple.",
      "Your partner wants to rebuild your lives abroad. Going could save the relationship but costs you your support network; staying keeps your support and ends the relationship.",
    ),
    l(
      "Partir et reconstruire mes repères pour tenter de sauver le couple.",
      "Move and rebuild my support system to try to save the relationship.",
    ),
    l(
      "Rester auprès de mes appuis et accepter la séparation.",
      "Stay near my support network and accept the separation.",
    ),
  ),
  q(
    "i01",
    "relationships",
    "independence",
    l(
      "Ta famille attend que tu reprennes son commerce. Refuser lui impose une vente douloureuse ; accepter t'oblige à abandonner le métier que tu as choisi.",
      "Your family expects you to take over their business. Refusing forces a painful sale; accepting means abandoning the career you chose.",
    ),
    l(
      "Choisir mon métier et laisser ma famille vendre le commerce.",
      "Choose my career and let my family sell the business.",
    ),
    l(
      "Reprendre le commerce et renoncer à mon projet professionnel.",
      "Take over the business and give up my career plans.",
    ),
    {},
    {},
    "belonging",
  ),
  q(
    "i02",
    "work",
    "independence",
    l(
      "Ton équipe veut signer une lettre collective dont tu désapprouves une demande centrale. Ta signature rendrait leur négociation crédible ; ton refus la ferait échouer.",
      "Your team wants to sign a joint letter whose central demand you disagree with. Your signature would make the negotiation credible; refusing would sink it.",
    ),
    l(
      "Refuser de signer une demande contraire à mes convictions.",
      "Refuse to sign a demand that goes against my beliefs.",
    ),
    l(
      "Signer pour soutenir le groupe, malgré mon désaccord.",
      "Sign to support the group, despite my disagreement.",
    ),
    {},
    {},
    "belonging",
  ),
  q(
    "i03",
    "travel",
    "independence",
    l(
      "Tu as économisé des années pour voyager seul. Ton groupe d'amis ne peut partir que si tu verses ta réserve dans leur caisse commune, ce qui annule ton voyage personnel.",
      "You saved for years to travel solo. Your friends can only take their trip if you put your savings into the shared fund, cancelling your own journey.",
    ),
    l(
      "Garder mon voyage et laisser le groupe renoncer au sien.",
      "Keep my solo trip and let the group give up theirs.",
    ),
    l(
      "Financer le voyage commun et abandonner mon itinéraire.",
      "Fund the shared trip and abandon my own itinerary.",
    ),
  ),
  q(
    "i04",
    "everyday",
    "independence",
    l(
      "Ta colocation décide de rester ensemble pour éviter une hausse de loyer à chacun. Tu as besoin de vivre seul ; ton départ rendra le logement trop cher pour les autres.",
      "Your housemates agree to stay together to keep rent affordable. You need to live alone; leaving would make the house too expensive for the others.",
    ),
    l(
      "Partir vivre seul, même si les autres doivent déménager.",
      "Move out on my own, even if the others must move too.",
    ),
    l(
      "Rester pour protéger leur logement, malgré mon besoin d'espace.",
      "Stay to protect their housing, despite my need for space.",
    ),
  ),
  q(
    "i05",
    "ethics",
    "independence",
    l(
      "Une communauté t'accueille à condition que tu caches durablement une part essentielle de ton identité. La quitter préserve ta liberté mais te laisse sans aucun soutien.",
      "A community will welcome you only if you permanently hide an essential part of who you are. Leaving preserves your freedom but leaves you without support.",
    ),
    l(
      "Partir pour vivre ouvertement, même sans soutien.",
      "Leave to live openly, even without support.",
    ),
    l(
      "Rester et cacher cette part de moi pour garder des liens.",
      "Stay and hide that part of myself to keep those connections.",
    ),
  ),
  q(
    "i06",
    "powers",
    "independence",
    l(
      "Un pouvoir permet à ton groupe de partager pensées et émotions, ce qui élimine ses malentendus. L'activer supprime aussi toute intimité mentale, pour toi comme pour eux. Tous te laissent trancher.",
      "A power lets your group share thoughts and feelings, ending misunderstandings. Activating it also removes everyone's mental privacy. They all leave the decision to you.",
    ),
    l(
      "Préserver nos pensées privées, en gardant nos incompréhensions.",
      "Preserve our private thoughts, keeping our misunderstandings.",
    ),
    l(
      "Partager nos pensées pour nous comprendre, sans jardin secret.",
      "Share our thoughts to understand each other, with no private inner world.",
    ),
  ),
  q(
    "i07",
    "absurd",
    "independence",
    l(
      "Sur une île, chacun doit porter un masque qui rend le groupe uni et paisible. Le tien efface ta personnalité tant que tu le portes. L'enlever te condamne à vivre à l'écart.",
      "On an island, everyone wears a mask that keeps the community united and peaceful. Yours erases your personality while you wear it. Removing it means living apart.",
    ),
    l(
      "Enlever le masque et vivre à l'écart en restant moi-même.",
      "Remove the mask and live apart while remaining myself.",
    ),
    l(
      "Porter le masque et appartenir au groupe en perdant ma singularité.",
      "Wear the mask and belong, at the cost of my individuality.",
    ),
  ),
  q(
    "i08",
    "relationships",
    "independence",
    l(
      "Un ami traverse une longue période difficile et veut que tu sois joignable chaque nuit. Accepter l'aide beaucoup mais épuise ta vie personnelle ; poser une limite lui donne le sentiment d'être abandonné.",
      "A friend in a prolonged rough patch wants you available every night. Agreeing helps them but drains your personal life; setting a boundary makes them feel abandoned.",
    ),
    l(
      "Poser une limite, même s'il se sent abandonné.",
      "Set a boundary, even if they feel abandoned.",
    ),
    l(
      "Rester disponible chaque nuit au prix de mon équilibre.",
      "Stay available every night at the cost of my own balance.",
    ),
  ),
  q(
    "i09",
    "work",
    "independence",
    l(
      "Une œuvre collective reçoit une offre à condition d'effacer ta contribution la plus personnelle. Ton refus annule le contrat de toute l'équipe ; accepter dénature ce que tu voulais dire.",
      "A collaborative artwork gets an offer on condition that your most personal contribution is removed. Refusing cancels the team's contract; accepting distorts your message.",
    ),
    l(
      "Refuser l'effacement de ma contribution, quitte à perdre le contrat commun.",
      "Refuse to erase my contribution, even if we lose the shared contract.",
    ),
    l(
      "Accepter pour que l'équipe obtienne le contrat.",
      "Accept so the team can secure the contract.",
    ),
    { structure: -1 },
    {},
  ),
  q(
    "i10",
    "everyday",
    "independence",
    l(
      "Tes voisins veulent un fonds commun obligatoire pour les coups durs. Tu y perdrais la liberté d'utiliser tes économies, mais ton refus empêche le fonds d'exister.",
      "Your neighbours want a compulsory shared emergency fund. You would lose control over your savings, but your refusal would stop the fund from existing.",
    ),
    l(
      "Garder la maîtrise de mes économies et renoncer au filet commun.",
      "Keep control of my savings and forgo the shared safety net.",
    ),
    l(
      "Mettre mes économies en commun, sans décider seul de leur usage.",
      "Pool my savings without sole control over how they are used.",
    ),
  ),
  q(
    "f01",
    "relationships",
    "future",
    l(
      "Une formation de deux ans garantirait une vie plus stable à ta famille. Elle t'éloignerait pendant les dernières années lucides d'un parent malade. Tu ne peux pas la reporter.",
      "A two-year training course would secure a more stable future for your family. It would take you away during an ill parent's last lucid years. You cannot defer it.",
    ),
    l(
      "Suivre la formation pour notre avenir, en perdant ce temps ensemble.",
      "Take the course for our future, losing that time together.",
    ),
    l(
      "Rester auprès de mon parent et renoncer à cette stabilité future.",
      "Stay with my parent and give up that future stability.",
    ),
    {},
    {},
    "horizon",
  ),
  q(
    "f02",
    "everyday",
    "future",
    l(
      "Une somme inattendue peut payer le dernier voyage dont rêve ta famille réunie, ou constituer une réserve qui évitera probablement de grosses difficultés dans cinq ans.",
      "An unexpected windfall can fund the last trip your whole family dreams of taking together, or build a reserve likely to prevent serious hardship in five years.",
    ),
    l(
      "Mettre la somme de côté et renoncer à ce voyage ensemble.",
      "Save the money and forgo that trip together.",
    ),
    l(
      "Faire ce voyage unique et accepter l'incertitude financière future.",
      "Take the once-in-a-lifetime trip and accept future financial uncertainty.",
    ),
    {},
    {},
    "horizon",
  ),
  q(
    "f03",
    "ethics",
    "future",
    l(
      "Un village peut consommer ses dernières semences pour ne pas avoir faim cet hiver, ou les planter pour une récolte abondante. Les planter impose des mois de rationnement sévère.",
      "A village can eat its remaining seeds to avoid hunger this winter, or plant them for a plentiful harvest. Planting means months of severe rationing.",
    ),
    l(
      "Planter les semences et imposer le rationnement maintenant.",
      "Plant the seeds and impose rationing now.",
    ),
    l(
      "Nourrir le village maintenant, sans réserve pour la récolte suivante.",
      "Feed the village now, without reserves for the next harvest.",
    ),
  ),
  q(
    "f04",
    "work",
    "future",
    l(
      "Ton association peut aider vingt personnes immédiatement ou financer un outil qui en aidera deux cents l'an prochain. Les vingt personnes ne peuvent pas attendre son arrivée.",
      "Your charity can help twenty people immediately or fund a tool that will help two hundred next year. The twenty cannot wait for it.",
    ),
    l(
      "Financer l'outil pour les deux cents futurs bénéficiaires.",
      "Fund the tool for two hundred future beneficiaries.",
    ),
    l(
      "Aider les vingt personnes aujourd'hui et renoncer à l'outil.",
      "Help the twenty people today and forgo the tool.",
    ),
  ),
  q(
    "f05",
    "powers",
    "future",
    l(
      "Tu peux donner dix années heureuses à ton futur toi, mais les payer par une année présente sans joie. Refuser te laisse vivre normalement, sans ces dix années garanties.",
      "You can give your future self ten happy years, paid for with one joyless year now. Refusing lets life carry on normally, without those ten guaranteed years.",
    ),
    l(
      "Traverser l'année sans joie pour les dix années futures.",
      "Endure the joyless year for ten happy years later.",
    ),
    l(
      "Préserver cette année de vie et renoncer à la garantie future.",
      "Preserve this year of life and give up the future guarantee.",
    ),
  ),
  q(
    "f06",
    "travel",
    "future",
    l(
      "Ton unique congé peut servir à revoir un ami qui déménage loin, ou à préparer une reconversion qui ne sera plus accessible ensuite. Aucun autre créneau n'est possible.",
      "Your only time off can be spent seeing a friend before they move far away, or preparing for a career change whose window will then close. There is no other time.",
    ),
    l(
      "Préparer la reconversion et manquer ces derniers jours ensemble.",
      "Prepare for the career change and miss those last days together.",
    ),
    l(
      "Revoir mon ami et laisser passer la reconversion.",
      "See my friend and let the career-change opportunity pass.",
    ),
  ),
  q(
    "f07",
    "absurd",
    "future",
    l(
      "Une horloge te permet de stocker chaque dimanche pour gagner des années de vie après 70 ans. Pendant vingt ans, tu travaillerais donc sans dimanche, tandis que tes proches en profiteraient sans toi.",
      "A clock lets you bank every Sunday for extra years after age seventy. For twenty years you would work through Sundays while your loved ones enjoy them without you.",
    ),
    l(
      "Stocker les dimanches pour vivre plus longtemps ensuite.",
      "Bank the Sundays to live longer later.",
    ),
    l(
      "Vivre mes dimanches avec mes proches, sans années supplémentaires.",
      "Spend my Sundays with loved ones, without the extra years.",
    ),
  ),
  q(
    "f08",
    "relationships",
    "future",
    l(
      "Ton couple peut retrouver une stabilité durable grâce à une année de séparation convenue. Rester ensemble évite la douleur immédiate mais laisse le conflit intact, sans autre solution disponible.",
      "Your relationship can regain lasting stability through an agreed year apart. Staying together avoids immediate pain but leaves the conflict unresolved, with no other option available.",
    ),
    l(
      "Accepter l'année de séparation pour reconstruire ensuite.",
      "Accept the year apart to rebuild afterwards.",
    ),
    l(
      "Rester ensemble maintenant, même avec ce conflit persistant.",
      "Stay together now, even with the continuing conflict.",
    ),
  ),
  q(
    "f09",
    "everyday",
    "future",
    l(
      "Un jardin partagé doit choisir entre couper ses arbres malades pour en planter de nouveaux, ou préserver dix ans d'ombre avant leur disparition définitive. Le budget ne permet qu'une intervention.",
      "A community garden must choose between cutting down diseased trees to plant new ones, or keeping ten more years of shade before they die. The budget covers one intervention only.",
    ),
    l(
      "Replanter maintenant et priver le quartier d'ombre plusieurs années.",
      "Replant now and leave the neighbourhood without shade for years.",
    ),
    l(
      "Garder l'ombre actuelle et renoncer au renouvellement financé.",
      "Keep today's shade and give up the funded renewal.",
    ),
  ),
  q(
    "f10",
    "work",
    "future",
    l(
      "Tu peux utiliser ton budget pour augmenter les salaires cette année ou pour financer une formation qui sécurisera les emplois à long terme. L'équipe vit difficilement avec ses revenus actuels.",
      "You can spend your budget on raises this year or training that will secure jobs long-term. The team is struggling on its current pay.",
    ),
    l(
      "Financer la formation, en laissant les difficultés de revenu durer.",
      "Fund the training, leaving the current pay hardship unresolved.",
    ),
    l(
      "Augmenter les salaires et renoncer à la formation protectrice.",
      "Raise salaries and forgo the training that would protect jobs.",
    ),
  ),
  q(
    "s01",
    "ethics",
    "structure",
    l(
      "Tu gères une file d'attente pour un logement. Une famille arrivée en dernier est en grande difficulté, mais passer devant ferait attendre une autre famille qui respecte les règles depuis un an.",
      "You manage a housing waiting list. A newly arrived family is in serious difficulty, but moving them ahead would delay another family that has followed the rules for a year.",
    ),
    l(
      "Respecter l'ordre de la file, malgré l'urgence nouvelle.",
      "Respect the waiting list, despite the new emergency.",
    ),
    l(
      "Créer une exception pour la nouvelle famille, au détriment de l'autre.",
      "Make an exception for the new family at the other's expense.",
    ),
    {},
    {},
    "exceptions",
  ),
  q(
    "s02",
    "work",
    "structure",
    l(
      "Une collègue a raté une date limite pour une raison personnelle légitime. Accepter son dossier oblige à refuser celui d'une personne qui a respecté toutes les consignes.",
      "A colleague missed a deadline for a legitimate personal reason. Accepting her application means rejecting someone who followed every instruction.",
    ),
    l(
      "Maintenir la date limite et refuser le dossier tardif.",
      "Enforce the deadline and reject the late application.",
    ),
    l(
      "Adapter la règle à sa situation et écarter le dossier ponctuel.",
      "Adapt the rule to her circumstances and reject the on-time application.",
    ),
    {},
    {},
    "exceptions",
  ),
  q(
    "s03",
    "travel",
    "structure",
    l(
      "Une expédition suit un plan sûr mais abandonnera son objectif à cause d'un retard. Une route improvisée pourrait permettre de réussir, sans aucune information fiable sur son état.",
      "An expedition's safe plan will miss its goal because of a delay. An improvised route could still get you there, with no reliable information about its condition.",
    ),
    l(
      "Suivre le plan sûr et renoncer à l'objectif.",
      "Follow the safe plan and give up the goal.",
    ),
    l(
      "Improviser la route pour tenter de réussir, sans garanties.",
      "Improvise the route to try to succeed, without guarantees.",
    ),
    { adventure: -1 },
    { adventure: 1 },
  ),
  q(
    "s04",
    "powers",
    "structure",
    l(
      "Une ville te propose de choisir son système de transports : un réseau parfaitement fiable mais figé pour trente ans, ou un réseau adaptable où les trajets sont souvent imprévisibles.",
      "A city asks you to choose its transport system: a perfectly reliable network fixed for thirty years, or an adaptable one with often unpredictable journeys.",
    ),
    l(
      "Garantir la fiabilité, même si les besoins changent ensuite.",
      "Guarantee reliability, even if needs change later.",
    ),
    l(
      "Préserver l'adaptation, malgré l'incertitude des trajets quotidiens.",
      "Preserve adaptability, despite uncertain daily journeys.",
    ),
  ),
  q(
    "s05",
    "relationships",
    "structure",
    l(
      "Un accord entre frères et sœurs répartit à parts égales un héritage. Le modifier permettrait à l'un de réaliser un projet unique, mais briserait la promesse faite aux autres.",
      "A sibling agreement splits an inheritance equally. Changing it would let one sibling pursue a unique project, but break the promise made to the others.",
    ),
    l(
      "Tenir l'accord égalitaire et laisser passer son projet.",
      "Keep the equal split and let the project go.",
    ),
    l(
      "Réinventer le partage pour son projet, en rompant l'accord.",
      "Redesign the split for the project, breaking the agreement.",
    ),
  ),
  q(
    "s06",
    "everyday",
    "structure",
    l(
      "Pour accueillir des voisins sans logement, tu peux suivre une procédure qui prendra un mois, ou improviser un hébergement collectif dès ce soir sans règles communes, avec un risque de conflits.",
      "To house displaced neighbours, you can follow a process taking a month, or arrange shared accommodation tonight without agreed rules, risking conflict.",
    ),
    l(
      "Attendre le cadre organisé, en laissant un mois d'incertitude.",
      "Wait for an organised framework, leaving a month of uncertainty.",
    ),
    l(
      "Improviser l'accueil immédiat, malgré les conflits possibles.",
      "Improvise immediate shelter, despite possible conflicts.",
    ),
  ),
  q(
    "s07",
    "absurd",
    "structure",
    l(
      "Un théâtre magique peut rejouer chaque soir un spectacle parfait et identique, ou inventer une œuvre nouvelle parfois sublime, parfois ratée. Les recettes financent un refuge.",
      "A magical theatre can repeat a perfect show every night, or invent a new one that may be brilliant or a disaster. Ticket sales fund a shelter.",
    ),
    l(
      "Choisir le spectacle reproductible pour stabiliser les recettes.",
      "Choose the repeatable show to stabilise income.",
    ),
    l(
      "Choisir la création nouvelle en acceptant des recettes incertaines.",
      "Choose new creations and accept uncertain income.",
    ),
    { adventure: -1 },
    { adventure: 1 },
  ),
  q(
    "s08",
    "work",
    "structure",
    l(
      "Une invention peut être livrée sous une forme éprouvée mais inaccessible à certains utilisateurs, ou repensée sans validation complète pour inclure tout le monde. Le financement s'arrête demain.",
      "An invention can ship in a tested form that excludes some users, or be redesigned without full validation to include everyone. Funding ends tomorrow.",
    ),
    l(
      "Livrer la forme éprouvée, malgré les personnes exclues.",
      "Ship the tested version, despite the people it excludes.",
    ),
    l(
      "Livrer la version repensée, malgré ses incertitudes.",
      "Ship the redesigned version, despite its uncertainties.",
    ),
  ),
  q(
    "s09",
    "ethics",
    "structure",
    l(
      "Un concours promet l'anonymat pour juger uniquement les œuvres. Connaître les parcours permettrait de soutenir des talents moins favorisés, mais changerait la règle après les candidatures.",
      "A competition promises anonymous judging based only on the work. Learning the entrants' backgrounds could support less privileged talent, but changes the rule after entries close.",
    ),
    l(
      "Garder le jugement anonyme promis, sans corriger les écarts de départ.",
      "Keep the promised anonymous judging, without correcting unequal starting points.",
    ),
    l(
      "Prendre les parcours en compte, en changeant la règle annoncée.",
      "Consider people's backgrounds, changing the announced rule.",
    ),
  ),
  q(
    "s10",
    "relationships",
    "structure",
    l(
      "Un ami te confie une fête importante avec un programme précis. Un imprévu permettrait une célébration plus personnelle, mais seulement en abandonnant ce qu'il t'a demandé.",
      "A friend entrusts you with an important celebration and an exact plan. An unexpected opportunity could make it more personal, but only by abandoning their instructions.",
    ),
    l(
      "Respecter le programme confié et laisser passer l'occasion.",
      "Honour the agreed plan and let the opportunity pass.",
    ),
    l(
      "Réinventer la fête, au risque de trahir ses attentes.",
      "Reinvent the celebration, risking a betrayal of their expectations.",
    ),
  ),
  q(
    "m01",
    "work",
    "ambition",
    l(
      "Ton travail a sauvé un projet, mais tout le mérite est attribué à ton responsable. Rétablir les faits t'ouvrirait une promotion et lui ferait perdre son poste ; te taire le protège.",
      "Your work saved a project, but your manager gets all the credit. Setting the record straight would earn you a promotion and cost them their role; silence protects them.",
    ),
    l(
      "Revendiquer ma contribution et accepter sa perte de poste.",
      "Claim my contribution and accept that they lose their role.",
    ),
    l(
      "Laisser le mérite à mon responsable et renoncer à ma promotion.",
      "Let my manager keep the credit and give up my promotion.",
    ),
    {},
    {},
    "recognition",
  ),
  q(
    "m02",
    "relationships",
    "ambition",
    l(
      "Tu as écrit anonymement un texte qui a rendu un ami célèbre, avec son accord. On t'offre enfin de reconnaître ton rôle, mais cela ruinerait sa réputation. Le secret était ta promesse.",
      "You anonymously wrote a piece that made a friend famous, with their agreement. You can finally receive credit, but it would ruin their reputation. Secrecy was your promise.",
    ),
    l(
      "Révéler mon rôle pour être reconnu, en rompant ma promesse.",
      "Reveal my role to receive recognition, breaking my promise.",
    ),
    l(
      "Tenir ma promesse et laisser mon travail porter son nom.",
      "Keep my promise and leave my work under their name.",
    ),
    {},
    {},
    "recognition",
  ),
  q(
    "m03",
    "ethics",
    "ambition",
    l(
      "Tu peux diriger une organisation utile, mais seulement en écartant la personne qui t'a formé et qui tient à son poste. Rester à ses côtés limite ton influence, mais respecte votre lien.",
      "You can lead an organisation doing good work, but only by replacing the mentor who wants to stay in charge. Staying beside them limits your influence but honours your bond.",
    ),
    l(
      "Prendre la direction en écartant mon mentor.",
      "Take the leadership role by replacing my mentor.",
    ),
    l(
      "Rester à ses côtés et renoncer à diriger.",
      "Stay beside them and give up the leadership role.",
    ),
  ),
  q(
    "m04",
    "travel",
    "ambition",
    l(
      "Une expédition propose de donner ton nom à sa découverte. Accepter efface celui d'un collaborateur moins connu ; refuser rend la découverte anonyme pour vous deux.",
      "An expedition offers to name its discovery after you. Accepting leaves out a lesser-known collaborator; refusing makes the discovery anonymous for both of you.",
    ),
    l(
      "Accepter que mon nom reste, même sans celui de mon collaborateur.",
      "Accept having my name remembered, even without my collaborator's.",
    ),
    l(
      "Choisir l'anonymat pour ne pas m'approprier notre découverte.",
      "Choose anonymity rather than claim our shared discovery.",
    ),
  ),
  q(
    "m05",
    "everyday",
    "ambition",
    l(
      "Un prix local récompense ton bénévolat. Accepter apporte une reconnaissance méritée, mais détourne l'attention d'un collectif discret ; refuser lui rend la scène sans mentionner ton rôle.",
      "A local award recognises your volunteering. Accepting gives you deserved credit but takes attention from a quiet collective; declining gives them the spotlight without mentioning you.",
    ),
    l(
      "Accepter le prix et prendre ma place dans la lumière.",
      "Accept the award and take my place in the spotlight.",
    ),
    l(
      "Céder la scène au collectif et rester sans reconnaissance publique.",
      "Give the collective the stage and remain publicly unrecognised.",
    ),
  ),
  q(
    "m06",
    "powers",
    "ambition",
    l(
      "Tu peux accomplir une œuvre qui changera le monde, mais tous ceux qui t'aiment t'oublieront. Ou accomplir une œuvre modeste, entouré des tiens, sans laisser de nom dans l'histoire.",
      "You can create something that changes the world, but everyone who loves you will forget you. Or do modest work surrounded by loved ones, leaving no name in history.",
    ),
    l(
      "Choisir l'œuvre immense et perdre ma place auprès des miens.",
      "Choose the world-changing work and lose my place among loved ones.",
    ),
    l(
      "Choisir la vie entourée et renoncer à cette trace immense.",
      "Choose life with loved ones and give up that vast legacy.",
    ),
    { future: 1 },
    {},
  ),
  q(
    "m07",
    "absurd",
    "ambition",
    l(
      "Un génie garantit que ton nom restera célèbre mille ans, mais chacun se souviendra aussi de ta pire erreur. Refuser efface toute trace publique de toi après ta mort.",
      "A genie guarantees your name will be famous for a thousand years, but everyone will also remember your worst mistake. Refusing erases all public trace of you after death.",
    ),
    l(
      "Accepter la célébrité avec le souvenir éternel de mon erreur.",
      "Accept fame with the permanent memory of my mistake.",
    ),
    l(
      "Accepter l'oubli public pour ne pas exposer cette erreur.",
      "Accept public oblivion rather than expose that mistake.",
    ),
  ),
  q(
    "m08",
    "work",
    "ambition",
    l(
      "Une promotion te permettrait enfin de décider, mais t'oblige à superviser et évaluer tes amis. La refuser préserve vos rapports d'égal à égal et ferme cette voie pour longtemps.",
      "A promotion would finally give you decision-making power, but requires you to supervise and assess your friends. Declining preserves your equal footing and closes that path for years.",
    ),
    l(
      "Accepter le pouvoir de décision et le changement de nos relations.",
      "Accept the decision-making power and the change in our relationships.",
    ),
    l(
      "Rester leur égal et renoncer à la promotion.",
      "Remain their peer and give up the promotion.",
    ),
  ),
  q(
    "m09",
    "relationships",
    "ambition",
    l(
      "Ton partenaire et toi êtes finalistes d'un concours décisif. Tu peux présenter ton meilleur travail, qui le dépassera certainement, ou une œuvre moindre pour lui laisser sa seule chance.",
      "You and your partner are finalists in a life-changing competition. You can submit your best work, which will certainly beat theirs, or a weaker piece to leave them their only chance.",
    ),
    l(
      "Présenter mon meilleur travail, même si mon partenaire perd.",
      "Submit my best work, even if my partner loses.",
    ),
    l(
      "Présenter une œuvre moindre et lui laisser cette chance.",
      "Submit a weaker piece and leave them that chance.",
    ),
  ),
  q(
    "m10",
    "ethics",
    "ambition",
    l(
      "Tu peux signer de ton nom une aide majeure, ce qui attirera aussi des soutiens pour tes projets. Les bénéficiaires préfèrent la discrétion ; agir anonymement respecte ce souhait mais te ferme ces portes.",
      "You can put your name on a major act of support, attracting backing for your own projects too. The recipients prefer discretion; anonymity honours their wish but closes those doors for you.",
    ),
    l(
      "Signer l'aide pour développer mon influence, malgré leur préférence.",
      "Put my name on the support to grow my influence, despite their preference.",
    ),
    l(
      "Agir anonymement et renoncer aux portes que cela m'ouvrirait.",
      "Act anonymously and give up the doors it could open for me.",
    ),
  ),
];
