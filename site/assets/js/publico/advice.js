// "Qué hacer ahora": tres acciones claras con iconos que cambian con el nivel.
import { $, setText, replay } from './dom.js';
import { icon, ADVICE_ICONS } from './icons.js';

export function createAdvice(root) {
  const list = $('.advice__list', root);
  const items = [0, 1, 2].map((i) => {
    const li = document.createElement('li');
    li.className = 'advice__item';
    li.style.setProperty('--i', i);
    li.innerHTML = '<span class="advice__icon"></span><span class="advice__text"></span>';
    list.appendChild(li);
    return { icon: li.firstChild, text: li.lastChild };
  });
  let status = null;

  return {
    update(snap) {
      const s = snap.system.status;
      const recs = snap.system.level.recommendations;
      if (status !== s) {
        status = s;
        root.dataset.status = s;
        items.forEach((it, i) => { it.icon.innerHTML = icon(ADVICE_ICONS[s][i], { size: 26, stroke: 2 }); });
        replay(list);
      }
      items.forEach((it, i) => setText(it.text, recs[i] ?? ''));
    }
  };
}
