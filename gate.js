/* Gate de acceso — Propuestas Geniorama × MedPlus
   NOTA: protección client-side, no es seguridad real.
   Cualquiera con DevTools puede saltársela. Sirve solo para evitar acceso casual. */
(function () {
    const EXPECTED_HASH = 'caa8944f138df5049438f99a9a8c80c2c805423f5ad27cd6de367f13ebacf84b';
    const STORAGE_KEY = 'medplus_unlocked_2026';

    // Si ya está desbloqueado en la sesión, no hacemos nada
    if (sessionStorage.getItem(STORAGE_KEY) === 'true') {
        return;
    }

    // Bloquear scroll del body hasta desbloqueo
    document.documentElement.style.overflow = 'hidden';

    async function sha256(text) {
        const data = new TextEncoder().encode(text);
        const buf = await crypto.subtle.digest('SHA-256', data);
        return Array.from(new Uint8Array(buf))
            .map(b => b.toString(16).padStart(2, '0'))
            .join('');
    }

    function buildGate() {
        const gate = document.createElement('div');
        gate.className = 'medplus-gate';
        gate.innerHTML = ''
            + '<div class="gate-card">'
            +   '<div class="gate-brand">'
            +     '<span class="gate-diamond"></span>'
            +     'GENIORAMA × MEDPLUS'
            +   '</div>'
            +   '<h2>ACCESO <span>PROTEGIDO</span></h2>'
            +   '<p class="gate-desc">Esta propuesta es confidencial. Ingresa la contraseña para acceder al contenido.</p>'
            +   '<form class="gate-form" autocomplete="off">'
            +     '<div class="gate-pwd-wrap">'
            +       '<input type="text" class="gate-pwd-real" placeholder="••••••••••••••••" autocomplete="off" autocorrect="off" autocapitalize="off" spellcheck="false" required>'
            +       '<div class="gate-pwd-display" aria-hidden="true"></div>'
            +     '</div>'
            +     '<button type="submit">DESBLOQUEAR &rarr;</button>'
            +   '</form>'
            +   '<p class="gate-error" role="alert" aria-live="polite"></p>'
            +   '<p class="gate-footer">Contenido confidencial · Propuesta Comercial 2026</p>'
            + '</div>';
        return gate;
    }

    const REVEAL_MS = 600;       // tiempo que se ve el último carácter
    const MASK_CHAR = '•';

    function mount() {
        const gate = buildGate();
        document.body.appendChild(gate);

        const input = gate.querySelector('.gate-pwd-real');
        const wrap = gate.querySelector('.gate-pwd-wrap');
        const display = gate.querySelector('.gate-pwd-display');
        const form = gate.querySelector('form');
        const error = gate.querySelector('.gate-error');

        // Focus + foco visual del wrap
        setTimeout(() => input.focus(), 80);
        input.addEventListener('focus', () => wrap.classList.add('is-focused'));
        input.addEventListener('blur', () => wrap.classList.remove('is-focused'));

        let revealTimer = null;

        // Cada vez que el usuario teclea, reconstruir display: bullets + último char visible
        input.addEventListener('input', () => {
            if (revealTimer) {
                clearTimeout(revealTimer);
                revealTimer = null;
            }

            const value = input.value;
            const len = value.length;

            if (len === 0) {
                display.textContent = '';
                display.classList.remove('is-masked');
                return;
            }

            // Render: (len-1) bullets + último carácter en un span resaltado
            display.classList.remove('is-masked');
            display.innerHTML = MASK_CHAR.repeat(Math.max(0, len - 1))
                + '<span class="gate-pwd-last">' + escapeHtml(value.slice(-1)) + '</span>';

            // Tras REVEAL_MS, ocultar el último carácter (volver a bullet)
            revealTimer = setTimeout(() => {
                display.textContent = MASK_CHAR.repeat(len);
                display.classList.add('is-masked');
            }, REVEAL_MS);
        });

        function escapeHtml(s) {
            return s
                .replace(/&/g, '&amp;')
                .replace(/</g, '&lt;')
                .replace(/>/g, '&gt;')
                .replace(/"/g, '&quot;')
                .replace(/'/g, '&#39;');
        }

        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            const value = input.value.trim();
            if (!value) return;

            let hash;
            try {
                hash = await sha256(value);
            } catch (err) {
                error.textContent = '✗ NAVEGADOR NO COMPATIBLE';
                return;
            }

            if (hash === EXPECTED_HASH) {
                sessionStorage.setItem(STORAGE_KEY, 'true');
                gate.classList.add('unlocked');
                document.documentElement.style.overflow = '';
                // Notifica a la página para que arranque animaciones bloqueadas por el gate
                document.dispatchEvent(new CustomEvent('medplus:unlocked'));
                setTimeout(() => gate.remove(), 500);
            } else {
                error.textContent = '✗ CONTRASEÑA INCORRECTA';
                input.value = '';
                display.textContent = '';
                display.classList.remove('is-masked');
                if (revealTimer) { clearTimeout(revealTimer); revealTimer = null; }
                gate.classList.add('shake');
                setTimeout(() => gate.classList.remove('shake'), 400);
                input.focus();
            }
        });
    }

    if (document.body) {
        mount();
    } else {
        document.addEventListener('DOMContentLoaded', mount, { once: true });
    }
})();
