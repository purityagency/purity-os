import 'dotenv/config';
import { InstagramAgent } from '../src/lib/agents/social/InstagramAgent';

async function main() {
  const agent = new InstagramAgent();
  console.log('Génération d’un plan Instagram (3 contenus)…\n');

  const items = await agent.generateContentPlan({
    count: 3,
    offerFocus: 'site premium + SEO local pour commerces & TPE belges',
    extraContext: 'Lancement de la présence Instagram de Purity Agency, objectif premiers clients.',
  });

  items.forEach((it, i) => {
    console.log(`\n════════ CONTENU ${i + 1} · ${it.pillar} · ${it.format} ════════`);
    console.log(`Titre    : ${it.title}`);
    console.log(`Hook     : ${it.hook}`);
    console.log(`\nLégende  :\n${it.caption}`);
    console.log(`\nCTA      : ${it.cta}`);
    console.log(`Hashtags : ${it.hashtags.map((h) => '#' + h).join(' ')}`);
    console.log(`Visuel   : ${it.visualBrief}`);
    if (it.reelScript) console.log(`\nScript reel:\n${it.reelScript}`);
    if (it.carouselSlides) console.log(`\nSlides:\n${it.carouselSlides.map((s, n) => `  ${n + 1}. ${s}`).join('\n')}`);
    console.log(`\n[auto-critique ${it.humanScore}/10] ${it.selfCritique}`);
  });

  console.log('\n\n✅ Agent Instagram opérationnel.');
  process.exit(0);
}

main().catch((e) => { console.error(e); process.exit(1); });
