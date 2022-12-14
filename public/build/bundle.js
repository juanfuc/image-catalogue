
(function(l, r) { if (!l || l.getElementById('livereloadscript')) return; r = l.createElement('script'); r.async = 1; r.src = '//' + (self.location.host || 'localhost').split(':')[0] + ':35729/livereload.js?snipver=1'; r.id = 'livereloadscript'; l.getElementsByTagName('head')[0].appendChild(r) })(self.document);
var app = (function () {
    'use strict';

    function noop() { }
    function assign(tar, src) {
        // @ts-ignore
        for (const k in src)
            tar[k] = src[k];
        return tar;
    }
    function add_location(element, file, line, column, char) {
        element.__svelte_meta = {
            loc: { file, line, column, char }
        };
    }
    function run(fn) {
        return fn();
    }
    function blank_object() {
        return Object.create(null);
    }
    function run_all(fns) {
        fns.forEach(run);
    }
    function is_function(thing) {
        return typeof thing === 'function';
    }
    function safe_not_equal(a, b) {
        return a != a ? b == b : a !== b || ((a && typeof a === 'object') || typeof a === 'function');
    }
    let src_url_equal_anchor;
    function src_url_equal(element_src, url) {
        if (!src_url_equal_anchor) {
            src_url_equal_anchor = document.createElement('a');
        }
        src_url_equal_anchor.href = url;
        return element_src === src_url_equal_anchor.href;
    }
    function is_empty(obj) {
        return Object.keys(obj).length === 0;
    }
    function create_slot(definition, ctx, $$scope, fn) {
        if (definition) {
            const slot_ctx = get_slot_context(definition, ctx, $$scope, fn);
            return definition[0](slot_ctx);
        }
    }
    function get_slot_context(definition, ctx, $$scope, fn) {
        return definition[1] && fn
            ? assign($$scope.ctx.slice(), definition[1](fn(ctx)))
            : $$scope.ctx;
    }
    function get_slot_changes(definition, $$scope, dirty, fn) {
        if (definition[2] && fn) {
            const lets = definition[2](fn(dirty));
            if ($$scope.dirty === undefined) {
                return lets;
            }
            if (typeof lets === 'object') {
                const merged = [];
                const len = Math.max($$scope.dirty.length, lets.length);
                for (let i = 0; i < len; i += 1) {
                    merged[i] = $$scope.dirty[i] | lets[i];
                }
                return merged;
            }
            return $$scope.dirty | lets;
        }
        return $$scope.dirty;
    }
    function update_slot_base(slot, slot_definition, ctx, $$scope, slot_changes, get_slot_context_fn) {
        if (slot_changes) {
            const slot_context = get_slot_context(slot_definition, ctx, $$scope, get_slot_context_fn);
            slot.p(slot_context, slot_changes);
        }
    }
    function get_all_dirty_from_scope($$scope) {
        if ($$scope.ctx.length > 32) {
            const dirty = [];
            const length = $$scope.ctx.length / 32;
            for (let i = 0; i < length; i++) {
                dirty[i] = -1;
            }
            return dirty;
        }
        return -1;
    }
    function append(target, node) {
        target.appendChild(node);
    }
    function insert(target, node, anchor) {
        target.insertBefore(node, anchor || null);
    }
    function detach(node) {
        node.parentNode.removeChild(node);
    }
    function destroy_each(iterations, detaching) {
        for (let i = 0; i < iterations.length; i += 1) {
            if (iterations[i])
                iterations[i].d(detaching);
        }
    }
    function element(name) {
        return document.createElement(name);
    }
    function text(data) {
        return document.createTextNode(data);
    }
    function space() {
        return text(' ');
    }
    function empty() {
        return text('');
    }
    function attr(node, attribute, value) {
        if (value == null)
            node.removeAttribute(attribute);
        else if (node.getAttribute(attribute) !== value)
            node.setAttribute(attribute, value);
    }
    function children(element) {
        return Array.from(element.childNodes);
    }
    function set_style(node, key, value, important) {
        if (value === null) {
            node.style.removeProperty(key);
        }
        else {
            node.style.setProperty(key, value, important ? 'important' : '');
        }
    }
    function toggle_class(element, name, toggle) {
        element.classList[toggle ? 'add' : 'remove'](name);
    }
    function custom_event(type, detail, { bubbles = false, cancelable = false } = {}) {
        const e = document.createEvent('CustomEvent');
        e.initCustomEvent(type, bubbles, cancelable, detail);
        return e;
    }

    let current_component;
    function set_current_component(component) {
        current_component = component;
    }

    const dirty_components = [];
    const binding_callbacks = [];
    const render_callbacks = [];
    const flush_callbacks = [];
    const resolved_promise = Promise.resolve();
    let update_scheduled = false;
    function schedule_update() {
        if (!update_scheduled) {
            update_scheduled = true;
            resolved_promise.then(flush);
        }
    }
    function add_render_callback(fn) {
        render_callbacks.push(fn);
    }
    // flush() calls callbacks in this order:
    // 1. All beforeUpdate callbacks, in order: parents before children
    // 2. All bind:this callbacks, in reverse order: children before parents.
    // 3. All afterUpdate callbacks, in order: parents before children. EXCEPT
    //    for afterUpdates called during the initial onMount, which are called in
    //    reverse order: children before parents.
    // Since callbacks might update component values, which could trigger another
    // call to flush(), the following steps guard against this:
    // 1. During beforeUpdate, any updated components will be added to the
    //    dirty_components array and will cause a reentrant call to flush(). Because
    //    the flush index is kept outside the function, the reentrant call will pick
    //    up where the earlier call left off and go through all dirty components. The
    //    current_component value is saved and restored so that the reentrant call will
    //    not interfere with the "parent" flush() call.
    // 2. bind:this callbacks cannot trigger new flush() calls.
    // 3. During afterUpdate, any updated components will NOT have their afterUpdate
    //    callback called a second time; the seen_callbacks set, outside the flush()
    //    function, guarantees this behavior.
    const seen_callbacks = new Set();
    let flushidx = 0; // Do *not* move this inside the flush() function
    function flush() {
        const saved_component = current_component;
        do {
            // first, call beforeUpdate functions
            // and update components
            while (flushidx < dirty_components.length) {
                const component = dirty_components[flushidx];
                flushidx++;
                set_current_component(component);
                update(component.$$);
            }
            set_current_component(null);
            dirty_components.length = 0;
            flushidx = 0;
            while (binding_callbacks.length)
                binding_callbacks.pop()();
            // then, once components are updated, call
            // afterUpdate functions. This may cause
            // subsequent updates...
            for (let i = 0; i < render_callbacks.length; i += 1) {
                const callback = render_callbacks[i];
                if (!seen_callbacks.has(callback)) {
                    // ...so guard against infinite loops
                    seen_callbacks.add(callback);
                    callback();
                }
            }
            render_callbacks.length = 0;
        } while (dirty_components.length);
        while (flush_callbacks.length) {
            flush_callbacks.pop()();
        }
        update_scheduled = false;
        seen_callbacks.clear();
        set_current_component(saved_component);
    }
    function update($$) {
        if ($$.fragment !== null) {
            $$.update();
            run_all($$.before_update);
            const dirty = $$.dirty;
            $$.dirty = [-1];
            $$.fragment && $$.fragment.p($$.ctx, dirty);
            $$.after_update.forEach(add_render_callback);
        }
    }
    const outroing = new Set();
    let outros;
    function transition_in(block, local) {
        if (block && block.i) {
            outroing.delete(block);
            block.i(local);
        }
    }
    function transition_out(block, local, detach, callback) {
        if (block && block.o) {
            if (outroing.has(block))
                return;
            outroing.add(block);
            outros.c.push(() => {
                outroing.delete(block);
                if (callback) {
                    if (detach)
                        block.d(1);
                    callback();
                }
            });
            block.o(local);
        }
        else if (callback) {
            callback();
        }
    }

    const globals = (typeof window !== 'undefined'
        ? window
        : typeof globalThis !== 'undefined'
            ? globalThis
            : global);
    function create_component(block) {
        block && block.c();
    }
    function mount_component(component, target, anchor, customElement) {
        const { fragment, on_mount, on_destroy, after_update } = component.$$;
        fragment && fragment.m(target, anchor);
        if (!customElement) {
            // onMount happens before the initial afterUpdate
            add_render_callback(() => {
                const new_on_destroy = on_mount.map(run).filter(is_function);
                if (on_destroy) {
                    on_destroy.push(...new_on_destroy);
                }
                else {
                    // Edge case - component was destroyed immediately,
                    // most likely as a result of a binding initialising
                    run_all(new_on_destroy);
                }
                component.$$.on_mount = [];
            });
        }
        after_update.forEach(add_render_callback);
    }
    function destroy_component(component, detaching) {
        const $$ = component.$$;
        if ($$.fragment !== null) {
            run_all($$.on_destroy);
            $$.fragment && $$.fragment.d(detaching);
            // TODO null out other refs, including component.$$ (but need to
            // preserve final state?)
            $$.on_destroy = $$.fragment = null;
            $$.ctx = [];
        }
    }
    function make_dirty(component, i) {
        if (component.$$.dirty[0] === -1) {
            dirty_components.push(component);
            schedule_update();
            component.$$.dirty.fill(0);
        }
        component.$$.dirty[(i / 31) | 0] |= (1 << (i % 31));
    }
    function init(component, options, instance, create_fragment, not_equal, props, append_styles, dirty = [-1]) {
        const parent_component = current_component;
        set_current_component(component);
        const $$ = component.$$ = {
            fragment: null,
            ctx: null,
            // state
            props,
            update: noop,
            not_equal,
            bound: blank_object(),
            // lifecycle
            on_mount: [],
            on_destroy: [],
            on_disconnect: [],
            before_update: [],
            after_update: [],
            context: new Map(options.context || (parent_component ? parent_component.$$.context : [])),
            // everything else
            callbacks: blank_object(),
            dirty,
            skip_bound: false,
            root: options.target || parent_component.$$.root
        };
        append_styles && append_styles($$.root);
        let ready = false;
        $$.ctx = instance
            ? instance(component, options.props || {}, (i, ret, ...rest) => {
                const value = rest.length ? rest[0] : ret;
                if ($$.ctx && not_equal($$.ctx[i], $$.ctx[i] = value)) {
                    if (!$$.skip_bound && $$.bound[i])
                        $$.bound[i](value);
                    if (ready)
                        make_dirty(component, i);
                }
                return ret;
            })
            : [];
        $$.update();
        ready = true;
        run_all($$.before_update);
        // `false` as a special case of no DOM component
        $$.fragment = create_fragment ? create_fragment($$.ctx) : false;
        if (options.target) {
            if (options.hydrate) {
                const nodes = children(options.target);
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                $$.fragment && $$.fragment.l(nodes);
                nodes.forEach(detach);
            }
            else {
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                $$.fragment && $$.fragment.c();
            }
            if (options.intro)
                transition_in(component.$$.fragment);
            mount_component(component, options.target, options.anchor, options.customElement);
            flush();
        }
        set_current_component(parent_component);
    }
    /**
     * Base class for Svelte components. Used when dev=false.
     */
    class SvelteComponent {
        $destroy() {
            destroy_component(this, 1);
            this.$destroy = noop;
        }
        $on(type, callback) {
            const callbacks = (this.$$.callbacks[type] || (this.$$.callbacks[type] = []));
            callbacks.push(callback);
            return () => {
                const index = callbacks.indexOf(callback);
                if (index !== -1)
                    callbacks.splice(index, 1);
            };
        }
        $set($$props) {
            if (this.$$set && !is_empty($$props)) {
                this.$$.skip_bound = true;
                this.$$set($$props);
                this.$$.skip_bound = false;
            }
        }
    }

    function dispatch_dev(type, detail) {
        document.dispatchEvent(custom_event(type, Object.assign({ version: '3.50.1' }, detail), { bubbles: true }));
    }
    function append_dev(target, node) {
        dispatch_dev('SvelteDOMInsert', { target, node });
        append(target, node);
    }
    function insert_dev(target, node, anchor) {
        dispatch_dev('SvelteDOMInsert', { target, node, anchor });
        insert(target, node, anchor);
    }
    function detach_dev(node) {
        dispatch_dev('SvelteDOMRemove', { node });
        detach(node);
    }
    function attr_dev(node, attribute, value) {
        attr(node, attribute, value);
        if (value == null)
            dispatch_dev('SvelteDOMRemoveAttribute', { node, attribute });
        else
            dispatch_dev('SvelteDOMSetAttribute', { node, attribute, value });
    }
    function validate_each_argument(arg) {
        if (typeof arg !== 'string' && !(arg && typeof arg === 'object' && 'length' in arg)) {
            let msg = '{#each} only iterates over array-like objects.';
            if (typeof Symbol === 'function' && arg && Symbol.iterator in arg) {
                msg += ' You can use a spread to convert this iterable into an array.';
            }
            throw new Error(msg);
        }
    }
    function validate_slots(name, slot, keys) {
        for (const slot_key of Object.keys(slot)) {
            if (!~keys.indexOf(slot_key)) {
                console.warn(`<${name}> received an unexpected slot "${slot_key}".`);
            }
        }
    }
    /**
     * Base class for Svelte components with some minor dev-enhancements. Used when dev=true.
     */
    class SvelteComponentDev extends SvelteComponent {
        constructor(options) {
            if (!options || (!options.target && !options.$$inline)) {
                throw new Error("'target' is a required option");
            }
            super();
        }
        $destroy() {
            super.$destroy();
            this.$destroy = () => {
                console.warn('Component was already destroyed'); // eslint-disable-line no-console
            };
        }
        $capture_state() { }
        $inject_state() { }
    }

    const images = [
        {
            t??tulo: "Indio yumbo",
            autor: "Vicente Alb??n",
            fecha: "1783",
            t??cnica: "??leo sobre lienzo",
            dimensiones: "",
            fuente: "Museo de Am??rica, Madrid",
            descripci??n: "",
            periodo: "Colonial",
            contexto: ["Ilustraci??n criolla", "Reformas borbonas", "Castas"],
            regi??n: "Frontera amaz??nica",
            lugar: "Audiencia de Quito",
            src: "./imgs/1.png", 
            keyword: "",
            repositorio: "http://ceres.mcu.es/pages/Main?idt=77&inventary=00076&table=FMUS&museum=MAM",
            id: 0

        },
        {
            t??tulo: "Quadro de Historia Natural, Civil, y Geogr??fica del Reyno del Per??,",
            autor: "Luis Thiebaut. Comisionado por Jos?? Ignacio Lecuanda",
            fecha: "1799",
            t??cnica: "??leo sobre lienzo",
            dimensiones: '331 x 118,5 cm',
            fuente: "Museo Nacional de Ciencias Naturales, Madrid",
            descripci??n: '',
            periodo: "colonial",
            contexto: ["Ilustraci??n criolla", "Reformas borbonas","Castas"],
            regi??n: "Frontera amaz??nica",
            lugar: "Virreinato del Peru",
            src:"./imgs/2.png", 
            keyword: "",
            repositorio: "https://artsandculture.google.com/asset/quadro-de-historia-natural-civil-y-geogr%C3%A1fica-del-reyno-del-per%C3%BA-jos%C3%A9-ignacio-de-lequanda/igE86USP5Q1cYg?hl=es",
            id: 1
        },
        {
            t??tulo: "Modos de cargar los indios a los que caminan por tierra de Quito a Napo",
            autor: "An??nimo. Expedici??n Malaspina",
            fecha: "1791",
            t??cnica: "Tinta y aguada, sobre papel",
            dimensiones: "17 x 11,5 cm",
            fuente: "Museo de Am??rica, Madrid",
            descripci??n: "",
            periodo: "Colonial",
            contexto: ["Expediciones cient??ficas", "Reformas borbonas", "Castas", "Viajes"],
            regi??n: "Frontera amaz??nica",
            lugar: "Virreinato del Peru",
            src:"./imgs/3.png", 
            keyword: "",
            repositorio: "http://ceres.mcu.es/pages/ResultSearch?Museo=MAM&txtSimpleSearch=Modo%20de%20cargar%20los%20indios%20a%20los%20que%20caminan&simpleSearch=0&hipertextSearch=1&search=simple&MuseumsSearch=MAM%7C&MuseumsRolSearch=11&listaMuseos=[Museo%20de%20Am%E9rica]",
            id: 2
        },
        {
            t??tulo: "Camino por las monta??as de la provincia de Antioquia",
            autor: "An??nimo",
            fecha: "Probable 1800",
            t??cnica: "Dibujo en papel",
            dimensiones: "",
            fuente: "Archivo General de Indias, MP-ESTAMPAS,257",
            descripci??n: "",
            periodo: "Colonial",
            contexto: ["Reformas borbonas", "Viajes"],
            regi??n: "Monta??as andinas Nueva Granada",
            lugar: "Antioquia",
            src:"./imgs/4.png", 
            keyword: "",
            repositorio: "http://pares.mcu.es/ParesBusquedas20/catalogo/description/18613#",
            id: 3
        },
        {
            t??tulo: "Modo de entrar a la provincia de Antioqu??a, 1802",
            autor: "An??nimo",
            fecha: "1802",
            t??cnica: "Dibujo en papel",
            dimensiones: "",
            fuente: "Archivo General de Indias, MP-ESTAMPAS,257Bis",
            descripci??n: "",
            periodo: "Colonial",
            contexto: ["Reformas borbonas", "Viajes"],
            regi??n: "Monta??as andinas Nueva Granada",
            lugar: "Antioquia",
            src:"./imgs/5.png", 
            keyword: "",
            repositorio: "http://pares.mcu.es/ParesBusquedas20/catalogo/description/18613#",
            id: 4
        },
        {
            t??tulo: "Passage du Quindiu dans le Cordill??re des Andes", 
            autor: "Alexander von Humboldt. Christian Friedrich Duttenhofer (Grab.). Joseph Anton Koch (Dibj.)",
            fecha: "1810",
            t??cnica: "Grabado",
            dimensiones: "",
            fuente: "Vues des Cordill??res, et Monuments des Peuples indig??nes de l???Am??rique, (Par??s: Schoell, 1810)",
            descripci??n: "",
            periodo: "Colonial",
            contexto: ["Expediciones cient??ficas", "Viajes", "Humboldt", "Paisajes"],
            regi??n: "Monta??as andinas Nueva Granada",
            lugar: "Camino del Quindio",
            src:"./imgs/6.png", 
            keyword: "",
            Repositorio: "",
            id: 5

        },
        {
            t??tulo: "Passage du Quindiu dans le Cordill??re des Andes. (Detalle)", 
            autor: "Alexander von Humboldt. Christian Friedrich Duttenhofer (Grab.). Joseph Anton Koch (Dibj.)",
            fecha: "1810",
            t??cnica: "Grabado",
            dimensiones: "",
            fuente: "Vues des Cordill??res, et Monuments des Peuples indig??nes de l???Am??rique, (Par??s: Schoell, 1810)",
            descripci??n: "",
            periodo: "Colonial",
            contexto: ["Expediciones cient??ficas", "Viajes", "Humboldt", "Paisajes"],
            regi??n: "Monta??as andinas Nueva Granada",
            lugar: "Camino del Quindio",
            src:"./imgs/7.png", 
            keyword: "",
            Repositorio: "",
            id: 6
        },
        {
            t??tulo: "Campamento camino del Quindio", 
            autor: "Francois Desire Roulin",
            fecha: "1824-1825",
            t??cnica: "Boceto a tinta",
            dimensiones: "",
            fuente: "Marguerite Combes, Pauvre et aventureuse. Bourgeoisie. Roulin et ses amis (1796-1874), (Paris: Peyronnet, 1929)",
            descripci??n: "",
            periodo: "Primera mitad siglo XIX",
            contexto:["Expediciones cient??ficas", "Viajes", "Tipos"],
            regi??n: "Monta??as andinas Nueva Granada",
            lugar: "Camino del Quindio",
            src: "./imgs/8.png", 
            keyword: "roulin",
            repositorio: "",
            id: 7
        }, 
        {
            t??tulo: "Peoner i andisca bergen", 
            autor: "August Gosselman. C. G. Plagemann[Dib.]. Gjothstrom Magnusson[Grab.]",
            fecha: "1827",
            t??cnica: "litograf??a",
            dimensiones: "15.2 ?? 10.3 cm",
            fuente: "Karl August Gosselman, Resa i Colombia, ??ren 1825 och 1826 (Estocolmo: Tryckt hos Joahn Horberg, 1827)",
            descripci??n: "",
            periodo: "Primera mitad siglo XIX",
            contexto: ["Viajes", "Comercio", "Tipos"],
            regi??n: "Monta??as andinas Nueva Granada",
            lugar: "Antioquia",
            src:"./imgs/9.jpg",
            keyword: "gosselman",
            repositorio: "",
            id: 8
        },
        {
            t??tulo: "Precipitous descent of a cordillera of the Andes in the province of Choc??", 
            autor: "Charles Stuart Cochrane [Atribuido]",
            fecha: "1825",
            t??cnica: "Grabado", 
            fuente: "Charles Stuart Cochrane, Journal of a Residence and Travels in Colombia, During the Years 1823 and 1824 (In Two volumes), (Londres: Henry Colburn, 1825)",
            descripci??n: "",
            periodo: "Primera mitad siglo XIX",
            contexto: ["Viajes", "Comercio", "Tipos"],
            regi??n: "Monta??as andinas Nueva Granada",
            lugar: "Camino a N??vita, Choc??",
            src:"./imgs/10.png",
            keyword: "cochrane",
            repositorio: "https://archive.org/details/journalaresiden00unkngoog/page/n8/mode/2up",
            id: 9
        },
        {
            t??tulo: "View of the pass from Quindio. In the province of Popayan & cargueros (or carriers) who travel it", 
            autor: "John Potter Hamilton [Atribuido]. Eduard Francis Finden [grab]",
            fecha: "1827",
            t??cnica: "Grabado",
            dimensiones: "",
            fuente: "John Potter Hamilton, Travels through the interior provinces of Columbia (Londres: John Murray, 1827)",
            descripci??n: "",
            periodo: "Primera mitad siglo XIX",
            contexto: ["Viajes", "Diplomacia", "Roulin", "Tipos"],
            regi??n: "Monta??as andinas Nueva Granada",
            lugar: "Camino del Quindio",
            src:"./imgs/11.png",
            keyword: "roulin",
            repositorio: "",
            id: 10
        },
        {
            t??tulo: "s/n", 
            autor: "Anonimo",
            fecha: "s/f",
            t??cnica: "Grabado",
            dimensiones: "",
            fuente: "Museo Nacional de Colombia",
            descripci??n: "",
            periodo: "Primera mitad siglo XIX",
            contexto: ["Viajes", "Roulin", "Tipos"],
            regi??n: "Monta??as andinas Nueva Granada",
            lugar: "s/i",
            src:"./imgs/12.png",
            keyword: "roulin",
            repositorio: "",
            id: 11
        },
        {
            t??tulo: "s/n", 
            autor: "Auguste Le Moyne [Atribuido]",
            fecha: "1828",
            t??cnica: "Acuarela sobre papel vejurrado de fabricaci??n industrial",
            dimensiones: "22 x 18cm",
            fuente: "Beatriz Gonz??lez, Donaci??n Carlos Botero-Nora Restrepo: Auguste Le Moyne en Colombia 1828-1841, (Bogot??: Museo Nacional de Colombia, 2004)",
            descripci??n: "",
            periodo: "Primera mitad siglo XIX",
            contexto: ["Viajes", "Diplomacia", "Roulin", "Groot", "Tipos"],
            regi??n: "Monta??as andinas Nueva Granada",
            lugar: "s/i",
            src:"./imgs/13.png",
            keyword: "gosselman",
            id: 12
        },
        {
            t??tulo: "The artist carried in a sillero over the Chiapas from Palenque to Ocosingo, Mexico", 
            autor: "Baron Jean???Fr??d??rik Waldeck",
            fecha: "1833",
            t??cnica: "??leo sobre Lienzo",
            dimensiones: "49.3 ?? 41.5 cm.",
            fuente: "Princeton University Art Museum",
            descripci??n: "",
            periodo: "Primera mitad siglo XIX",
            contexto: ["Viajes", "Expediciones cient??ficas", "M??xico", "Tipos"],
            regi??n: "Monta??as de Mesoamerica",
            lugar: "Chiapas. Camino a Palenque",
            src:"./imgs/14.png",
            keyword: "",
            id: 13
        },
        {
            t??tulo: "Viajero llevado sobre la espalda del indio en las monta??as de la provincia de Antioquia", 
            autor: "Auguste Le Moyne [Atribuido]",
            fecha: "1835",
            t??cnica: "Acuarela sobre papel vejurrado de fabricaci??n industrial",
            dimensiones: "26.3 x 17.8cm",
            fuente: "Beatriz Gonz??lez, Donaci??n Carlos Botero-Nora Restrepo: Auguste Le Moyne en Colombia 1828-1841, (Bogot??: Museo Nacional de Colombia, 2004)",
            descripci??n: "Tiene la misma pose de las manos cruzadas del carguero de Gosselman. La composici'on se asemeja al boceto sin t??tulo de la coleccion de Joseph Brown",
            periodo: "Primera mitad siglo XIX",
            contexto: ["Viajes", " Diplomacia", "Roulin", "Groot", "Gosselman", "Tipos"],
            regi??n: "Monta??as andinas Nueva Granada",
            lugar: "Antioquia",
            src:"./imgs/15.png",
            keyword: "gosselman",
            repositorio: "",
            id: 14
        },
        {
            t??tulo: "[Carguero]", 
            autor: "Joseph Brown [Atribuido]",
            fecha: "1826-1840",
            t??cnica: "Boceto a tinta",
            dimensiones: " 33.6 x 24 cm",
            fuente: "Colecci??n de pinturas de Joseph Brown. Royal geographical society of London",
            descripci??n: "Tiene la misma pose con las manos cruzadas del carguero de Gosselman. La composicion se asemeja al boceto sin t??tulo de la coleccion de August Le Moyne",
            periodo: "Primera mitad siglo XIX",
            contexto: ["Viajes", "Diplomacia", "Groot", "Gosselman", "Tipos"],
            regi??n: "Monta??as andinas Nueva Granada",
            lugar: "s/i",
            src:"./imgs/16.png",
            keyword: "gosselman",
            id: 15
        },
        {
            t??tulo: "Men Carriers", 
            autor: "Saturday Magazine",
            fecha: "1839",
            t??cnica: "Boceto a tinta",
            dimensiones: "",
            fuente: "Glances at the Modes of Traveling in Foreign Lands, The Saturday Magazine 449 (1839): 250-256",
            descripci??n: "En Inglaterra, en 1839, apareci?? una alusi??n a la met??fora que comparaba al carguero con un animal de carga -en referencia a la an??cdota de Humboldt- en un art??culo de The Saturday Magazine donde se discut??a sobre los tipos de carruajes usados en diversos lugares del mundo y la fuerza motriz que los mov??a. All??, el horizonte de expectativa se proyecta hacia un escenario en el que estas fuerzas podr??n ser de otra naturaleza y reemplazar las de los animales y los hombres. El Saturday Magazine era la revista que compet??a con The Penny Magazine. Estas revistas fueron pioneras en el uso de un modelo de impresi??n que El modelo consist??a en un formato de publicaci??n, unas aplicaciones tecnol??gicas del uso de la xilograf??a y el prototipado, un proceso de racionalizaci??n de la producci??n de impresos, un modelo de negocio y un ideal acerca de la correlaci??n que hay entre la expansi??n del mercado de lectores y la posibilidad de llevar el acceso al conocimiento '??til' hasta las clases populares. Ver 'The Commercial History of a Penny Magazine', The Penny Magazine 1 (1833): 377 (suplemento). ",
            periodo: "Primera mitad siglo XIX",
            contexto: ["Viajes","Prensa", "Humboldt", "Tipos"],
            regi??n: "Monta??as andinas Nueva Granada",
            lugar: "Camino del Quindio",
            src:"./imgs/17.png",
            keyword: "Humboldt",
            repositorio: "",
            id: 16
        },
        {
            t??tulo: "Costumes / Colombie", 
            autor: "Anonimo",
            fecha: "1837",
            t??cnica: "Aguafuerte coloreado sobre papel",
            dimensiones: "",
            fuente: "L'Univers. Histoire et Description de tous les Peuples. Bresil par Ferdinand Denis & Colombie et Guyanes par Cesar Famin (Paris: Firmin Didot Fr??res ??diteurs, 1837)",
            descripci??n: "Las l??minas que sirvieron de modelo a la composici??n fueron identificadas por Beatriz Gonz??lez y Carolina Vanegas, 2017. Esta ??ltima afirma que la figura del carguero est?? basada en la l??mina de Hamilton",
            periodo: "Primera mitad siglo XIX",
            contexto: ["Viajes", "Roulin", "Tipos"],
            regi??n: "Monta??as andinas Nueva Granada",
            lugar: "Camino del Quindio",
            src:"./imgs/18.png", 
            keyword: "roulin",
            repositorio: "",
            id: 17
        },
        {
            t??tulo: "Le passage du Quindiu entre Ibague y Cartago", 
            autor: "Alcide d'Orbigny. Original de Francois Desire Roulin",
            fecha: "1836",
            t??cnica: "Grabado",
            dimensiones: "",
            fuente: "Alcide D???Orbigny, Voyage pittoresque dans les deux Am??riques (Chez L. Tenr??, Libraire-??diteur)",
            descripci??n: "",
            periodo: "Primera mitad siglo XIX",
            contexto: ["Viajes", "Expediciones cient??ficas", "Roulin", "Tipos"],
            procedencia: "Francia",
            regi??n: "Monta??as andinas Nueva Granada",
            lugar: "Camino del Quindio",
            src:"./imgs/19.png",
            keyword: "roulin",
            repositorio: "",
            id: 18
        },
        {
            t??tulo: "El Tabillo: Mani??re dont les voyageurs sont port??s ?? dos d???homme dans les envirous de Pasto ", 
            autor: "A de Lattre. Original de Francois Desire Roulin",
            fecha: "1848",
            t??cnica: "Grabado",
            dimensiones: "",
            fuente: "Le Magasin pittoresque, 16, 1848",
            descripci??n: "Descripci??n del carguero en el Putumayo. Llama la atenci??n que la t??cnica usada es diferente, la silla es m??s rudimentaria, y el pasajero mira hacia delante. Notar relaci??n con la acuarela de Guti??rrez de Alba que refiere a un carguero en Caquet??, y con la del carguero de Ecuador de la expedici??n Malaspina. Parece ser una caracter??stica propia de los ejemplares del sur",
            periodo: "Mediados del siglo XIX",
            contexto: ["Viajes","Prensa", "Tipos"],
            procedencia: "Francia",
            regi??n: "Frontera amaz??nica",
            lugar: "Putumayo",
            src:"./imgs/20.png",
            keyword: "",
            repositorio: "",
            id: 19
        },
        {
            t??tulo: "Passage d???un torrent", 
            autor: "A de Lattre. Original de Francois Desire Roulin",
            fecha: "1848",
            t??cnica: "Grabado",
            dimensiones: "",
            fuente: "Le Magasin pittoresque, 16, 1848",
            descripci??n: "",
            periodo: "Mediados del siglo XIX",
            contexto: ["Prensa", "Viajes", "Tipos"],
            procedencia: "Francia",
            regi??n: "Frontera amaz??nica",
            lugar: "Putumayo",
            src:"./imgs/21.png",
            keyword: "",
            repositorio: "",
            id: 20
        },
        {
            t??tulo: "La silla: mani??re de porter les voyageurs dans le Quindiu", 
            autor: "A de Lattre. Original de Francois Desire Roulin",
            fecha: "1848",
            t??cnica: "Grabado",
            dimensiones: "",
            fuente: "Le Magasin pittoresque, 16, 1848",
            descripci??n: "Tomada del modelo de Roulin. Se usa para contrastar con el m??todo de las tierras del sur, llamado Tablillo",
            periodo: "Mediados del siglo XIX",
            contexto: ["Prensa", "Viajes", "Tipos", "Roulin"],
            procedencia: "Francia",
            regi??n: "Monta??as andinas Nueva Granada",
            lugar: "Camino del Quind??o",
            src:"./imgs/22.png",
            keyword: "roulin",
            repositorio: "",
            id: 21
        },
        {
            t??tulo: "La silla: mani??re de porter les voyageurs dans le Quindiu (Detalle)", 
            autor: "A de Lattre. Original de Francois Desire Roulin",
            fecha: "1848",
            t??cnica: "Grabado",
            dimensiones: "",
            fuente: "Le Magasin pittoresque, 16, 1848",
            descripci??n: "",
            periodo: "Mediados del siglo XIX",
            contexto: ["Prensa", "Viajes", "Tipos", "Roulin"],
            procedencia: "Francia",
            regi??n: "Monta??as andinas Nueva Granada",
            lugar: "Camino del Quind??o",
            src:"./imgs/23.png",
            keyword: "roulin",
            repositorio: "",
            id: 22
        },
        {
            t??tulo: "La silla: mani??re de porter les voyageurs dans le Quindiu (P??gina completa)", 
            autor: "A de Lattre. Original de Francois Desire Roulin",
            fecha: "1848",
            t??cnica: "Grabado",
            dimensiones: "",
            fuente: "Le Magasin pittoresque, 16, 1848",
            descripci??n: "",
            periodo: "Mediados del siglo XIX",
            contexto: ["Prensa", "Viajes", "Tipos", "Roulin"],
            procedencia: "Francia",
            regi??n: "Monta??as andinas Nueva Granada",
            lugar: "Camino del Quind??o",
            src:"./imgs/24.png",
            keyword: "roulin",
            repositorio: "",
            id: 23
        },
        {
            t??tulo: "s/t", 
            autor: "Cordech (Atribuido)",
            fecha: "1849",
            t??cnica: "Grabado",
            dimensiones: "",
            fuente: "Semanario Pintoresco Espa??ol 12 (1849): 91",
            descripci??n: "En 1849 apareci?? la misma imagen del art??culo de Magasin Pittoresque de A de Lattre, aunque atribuy??ndole el cr??dito a otro dibujante y sin atribuciones al grabado, en una versi??n espa??ola de la revista francesa denominada el Semanario Pintoresco Espa??ol atribuido a 'un viajero'",
            periodo: "Mediados del siglo XIX",
            contexto: ["Prensa", "Viajes", "Tipos", "Roulin"],
            procedencia: "Espa??a",
            regi??n: "Monta??as andinas Nueva Granada",
            lugar: "Camino del Quind??o",
            src:"./imgs/25.png",
            keyword: "roulin",
            repositorio: "",
            id: 24
        },
        {
            t??tulo: "Die Silla", 
            autor: "AHC. Rose",
            fecha: "1851",
            t??cnica: "Grabado",
            dimensiones: "",
            fuente: "Das Pfennig-Magazin 19 (1851)",
            descripci??n: "Otro ejemplar de la imagen del art??culo de A de Lattre en Magasin Pittoresque puede encontrarse, con las mismas atribuciones al dibujante y al grabador, en la revista alemana Das Pfennig-Magazin, publicada en 1851. De acuerdo con un modelo de producci??n de impresos y de distribuci??n y comercializaci??n popularizado por The Penny Magazine -la directa competidora de The Saturday Magazine-, era habitual que entre estas revistas se compraran entre ellas los art??culos y las planchas xilogr??ficas para producir las im??genes y de esta manera llenar el contenido de las propias publicaciones. Estas revistas estaban orientadas a un p??blico amplio y ten??an un ??nimo de instrucci??n y educaci??n popular.",
            periodo: "Mediados del siglo XIX",
            contexto: ["Prensa", "Viajes", "Tipos", "Roulin"],
            procedencia: "Alemania",
            regi??n: "Monta??as andinas Nueva Granada",
            lugar: "Camino del Quind??o",
            src:"./imgs/26.png",
            keyword: "roulin",
            repositorio: "",
            id: 25
        },
        {
            t??tulo: "Die Silla", 
            autor: "AHC. Rose",
            fecha: "1851",
            t??cnica: "Grabado",
            dimensiones: "",
            fuente: "Das Pfennig-Magazin 19 (1851)",
            descripci??n: "Otro ejemplar de la imagen del art??culo de A de Lattre en Magasin Pittoresque puede encontrarse, con las mismas atribuciones al dibujante y al grabador, en la revista alemana Das Pfennig-Magazin, publicada en 1851. De acuerdo con un modelo de producci??n de impresos y de distribuci??n y comercializaci??n popularizado por The Penny Magazine -la directa competidora de The Saturday Magazine-, era habitual que entre estas revistas se compraran entre ellas los art??culos y las planchas xilogr??ficas para producir las im??genes y de esta manera llenar el contenido de las propias publicaciones. Estas revistas estaban orientadas a un p??blico amplio y ten??an un ??nimo de instrucci??n y educaci??n popular.",
            periodo: "Mediados del siglo XIX",
            contexto: ["Prensa", "Viajes", "Tipos", "Roulin"],
            procedencia: "Alemania",
            regi??n: "Monta??as andinas Nueva Granada",
            lugar: "Camino del Quind??o",
            src:"./imgs/27.png",
            keyword: "roulin",
            repositorio: "",
            id: 26
        },
        {
            t??tulo: "Cargueros", 
            autor: "s/a",
            fecha: "1846",
            t??cnica: "Grabado",
            dimensiones: "",
            fuente: "Humbolt's travels and discoveries in South America, (Londres: John W. Parker, 1846)",
            descripci??n: "Esta edici??n no tienen un autor identificado y relata los viajes de Humboldt en tercera persona. Otmar Ette ha mostrado c??mo muchos editores se aprovecharon de la fama del viaje de Humboldt y las expectativas del p??blico de informarse de estos sin tener que esforzarse demasiado en asuntos t??cnicos. La obra parece seguir el itinerario de Relation historique. El resto del viaje es recosnrtruido con fragmentos de Vues y se despachan en un solo cap??tulo. La mayor??a de las im??genes son copias de mala calidad de Vues. Algunas otras no son de las obras de Humboldt. El carguero aparece en la primera p??gina debajo del t??tulo y en la p??gina 253. Es tomado de la quinta l??mina de Vues, pero no aparece en su totalidad, sino apenas un primer plano. Por su parte, el carguero que en la l??mina de Humboldt no est?? cargando a nadie, en este caso si lleva carga. Es la misma imagen usada en el art??culo de 1839 en The Saturday Magazine. Ambos productos fueron publicados por la misma editorial. Probablemente usaron la misma plancha para hacer el grabado",
            periodo: "Mediados del siglo XIX",
            contexto: ["Prensa", "Viajes", "Tipos", "Humboldt"],
            procedencia: "Alemania",
            regi??n: "Monta??as andinas Nueva Granada",
            lugar: "Camino del Quind??o",
            src:"./imgs/28.png",
            keyword: "Humboldt",
            repositorio: "",
            id: 27
        },
        {
            t??tulo: "Camino a N??vita en la monta??a de Taman??", 
            autor: "Anonimo (erroneamente atribuida a Manuel Maria Paz)",
            fecha: "1853",
            t??cnica: "Acuarela sobre papel",
            dimensiones: "",
            fuente: "Coleccion Acuarelas de la Comision Corografica. Biblioteca Nacional de Colombia, Bogot??.",
            descripci??n: "La l??mina plantea un evidente contraste entre el estatus civilizado, subrayado por el libro abierto, la postura y el atuendo del viajero, y ???lo b??rbaro del carguero y su entorno??? (Appelbaum 2017, 95). Es una ilustraci??n de un pasaje relatado en los viajez de Santiago P??rez, por aquel entonces relator de la Comisi??n corogr??fica, publicados en El Neogranadino. La imagen fue compuesta por un autor an??nimo -probablemente Le??n Ambrose Gauthier- a partir de un boceto de Manuel Mar??a Paz y del relato de Santiago P??rez",
            periodo: "Mediados del siglo XIX",
            contexto: ["Expediciones cient??ficas", "Tipos"],
            procedencia: "Colombia",
            regi??n: "Monta??as andinas Nueva Granada",
            lugar: "Camino a N??vita, Choc??",
            src:"./imgs/29.png", 
            keyword: "",
            repositorio: "",
            id: 28
        },
        {
            t??tulo: "Manisales, provincia de C??rdova", 
            autor: "Henry Price",
            fecha: "1852",
            t??cnica: "Acuarela sobre papel",
            dimensiones: "",
            fuente: "Coleccion Acuarelas de la Comision Corografica. Biblioteca Nacional de Colombia, Bogot??.",
            descripci??n: "El carguero de esta acuarela, al contrario del de la imagen Camino a N??vita Barbacoas, tiene piel clara y barba, y lleva en sus espaldas a alguien que puede ser considerado su par. Para Appelbaum, la diferencia entre las dos l??minas de los cargueros sintetiza la percepci??n tan distinta que la Comisi??n ten??a de las ???tierras bajas??? de la costa pac??fica con respecto a las ???tierras altas??? de las provincias andinas. Los habitantes de las tierras altas andinas, ???algo toscos, pero en general laboriosos, estaban a la espera de mejores instituciones republicanas??? (2017, 97). Por el contrario, los habitantes de la costa pac??fica fueron rotulados de ???negros??? y eran considerados b??rbaros que no merec??an instituciones democr??ticas sino la aplicaci??n de medidas coercitivas (Appelbaum 2017, 98).",
            periodo: "Mediados del siglo XIX",
            contexto: ["Viajes","Expediciones cient??ficas", "Tipos"],
            procedencia: "Colombia",
            regi??n: "Monta??as andinas Nueva Granada",
            lugar: "Antioquia",
            src:"./imgs/30.png", 
            keyword: "",
            repositorio: "",
            id: 29
        },
        {
            t??tulo: "Antiguo modo de viajar por la monta??a del Quind??o", 
            autor: "Ram??n Torres M??ndez",
            fecha: "1851",
            t??cnica: "Grabado",
            dimensiones: "",
            fuente: "El Pasatiempo [Bogot??] dic. 20, 1851.",
            descripci??n: "El Pasatiempo, El Neogranadino y la colecci??n de l??minas Costumbres neogranadinas son proyectos editoriales que est??n relacionados con un mismo taller de imprenta (promovido por Manuel Anc??zar). Este se caracteriz?? por una transformaci??n de la concepci??n sobre la  peri??dica que contempla la necesidad de expandir la conformaci??n de un p??blico mediante innovaciones tecnol??gicas, procesos de racionalizaci??n de la producci??n y estrategias de difusi??n. Siguieron los pasos de ??mile de Girardin, un periodista franc??s que hab??a seguido el ejemplo del Magasin Pittoresque de ??douard Charton. En octubre de 1851, por ejemplo, se anunci?? la publicaci??n de una serie de l??minas iluminadas??? que pretend??an promocionar suscripciones a los peri??dicos de la imprenta.  A partir del 8 de noviembre de 1851, aparecieron cada semana en el peri??dico descripciones detalladas de las l??minas, acompa??adas de xilograf??as que representaban detalles de las originales",
            periodo: "Mediados del siglo XIX",
            contexto: ["Viajes", "Prensa", "Tipos"],
            procedencia: "Colombia",
            regi??n: "Monta??as andinas Nueva Granada",
            lugar: "Camino del Quind??o",
            src:"./imgs/31.png", 
            keyword: "",
            Repositorio: "",
            id: 30
        },
        {
            t??tulo: "Antiguo modo de viajar por la monta??a del Quind??o", 
            autor: "Ram??n Torres M??ndez",
            fecha: "1851",
            t??cnica: "litograf??a iluminada",
            dimensiones: "",
            fuente: "Colecci??n  de  arte  del  Banco  de  la  Rep??blica,  Bogot??.  La  litograf??a  pertenece  al  ??lbum  Costumbres neogranadinas, impreso en la litograf??a de Mart??nez y hermanos",
            descripci??n: "El Pasatiempo, El Neogranadino y la colecci??n de l??minas Costumbres neogranadinas son proyectos editoriales que est??n relacionados con un mismo taller de imprenta (promovido por Manuel Anc??zar). Este se caracteriz?? por una transformaci??n de la concepci??n sobre la  peri??dica que contempla la necesidad de expandir la conformaci??n de un p??blico mediante innovaciones tecnol??gicas, procesos de racionalizaci??n de la producci??n y estrategias de difusi??n. Siguieron los pasos de ??mile de Girardin, un periodista franc??s que hab??a seguido el ejemplo del Magasin Pittoresque de ??douard Charton. En octubre de 1851, por ejemplo, se anunci?? la publicaci??n de una serie de l??minas iluminadas??? que pretend??an promocionar suscripciones a los peri??dicos de la imprenta.  A partir del 8 de noviembre de 1851, aparecieron cada semana en el peri??dico descripciones detalladas de las l??minas, acompa??adas de xilograf??as que representaban detalles de las originales",
            periodo: "Mediados del siglo XIX",
            contexto: ["Arte", "Viajes", "Prensa", "Tipos", "Costumbres"],
            procedencia: "Colombia",
            regi??n: "Monta??as andinas Nueva Granada",
            lugar: "Camino del Quind??o",
            src:"./imgs/32.png", 
            keyword: "",
            Repositorio: "",
            id: 31
        },
        {
            t??tulo: "Silleros in the Quind??o", 
            autor: "Isaac F. Holton",
            fecha: "1857",
            t??cnica: "Grabado",
            dimensiones: "",
            fuente: "New Granada: Twenty Months in the Andes, (Nueva York: Harper and Brothers Publishers, 1857) 364",
            descripci??n: "Holton tom?? todas las im??genes de las l??minas de las costumbres neogranadinas de Ram??n Torres M??ndez. No cita al autor neogranadino y se refiere a las situaciones de las im??genes como si estas representasen an??cdotas personales. Esta en particular es tomada de la l??mina Modo de viajar en las monta??as de Quind??o y Sons??n",
            periodo: "Segunda mitad del siglo XIX",
            contexto: ["Viajes", "Tipos", "Torres M??ndez"],
            procedencia: "Estados Unidos",
            regi??n: "Monta??as andinas Nueva Granada",
            lugar: "Camino del Quind??o",
            src:"./imgs/33.png", 
            keyword: "",
            repositorio: "",
            id: 32
        },
        {
            t??tulo: "Ridding in a Silla", 
            autor: "Frederick Catherwood",
            fecha: "1857",
            t??cnica: "Grabado",
            dimensiones: "",
            fuente: "John Lloyd Stephens, Incidents of travel in Central America, Chiapas and Yucatan, (Londres: Arthur Hall, Virtue y Co, 1857)",
            descripci??n: "",
            periodo: "Segunda mitad siglo XIX",
            contexto: ["Viajes", "Expediciones cient??ficas", "Tipos", "M??xico"],
            regi??n: "Monta??as de Mesoamerica",
            lugar: "Chiapas. Camino a Palenque",
            src:"./imgs/34.png",
            keyword: "",
            repositorio: "",
            id: 33
        },
        {
            t??tulo: "Pe??n carguero de las tierras altas", 
            autor: "Ram??n Torres M??ndez",
            fecha: "1851",
            t??cnica: "litograf??a iluminada",
            dimensiones: "",
            fuente: "Colecci??n de arte del Banco de la Rep??blica, Bogot??",
            descripci??n: "",
            periodo: "Mediados del siglo XIX",
            contexto: ["Arte", "Viajes", "Prensa", "Tipos", "Costumbres"],
            procedencia: "Colombia",
            regi??n: "Monta??as andinas Nueva Granada",
            lugar: "", 
            src:"./imgs/35.png", 
            keyword: "",
            repositorio: "",
            id: 34
        },
        {
            t??tulo: "Porteur de Quindi??", 
            autor: " Charles Saffray. A. de Neuville (Dibj.)",
            fecha: "1873",
            t??cnica: "Grabado",
            dimensiones: "",
            fuente: "Le Tour du Monde 26 (1873)",
            descripci??n: "La pose con el pie derecho hacia delante recuerda la pose del 'Pe??n carguero de las tierras altas' de Torres M??ndez.",
            periodo: "Segunda mitad siglo XIX",
            contexto: ["Viajes", "Prensa", "Tipos", "Torres M??ndez"],
            procedencia: "Francia",
            regi??n: "Monta??as andinas Nueva Granada",
            lugar: "Camino del Quind??o", 
            src:"./imgs/36.png", 
            keyword: "",
            repositorio: "https://gallica.bnf.fr/ark:/12148/bpt6k104971v/f79.item",
            id: 35
        },
        {
            t??tulo: "La montagne de Quindi??", 
            autor: "Charles Saffray. A. de Neuville (Dibj.)",
            fecha: "1826-1840",
            t??cnica: "Grabado. 15,6 x 11,7 cm, blanco y negro",
            dimensiones: "",
            fuente: "Charles Saffray, Voyage ?? la Nouvelle Grenade. Le Tour de monde, 26, 1973",
            descripci??n: "La disposici??n recuerda al la l???ina de carguero de Cochrane",
            periodo: "Segunda mitad siglo XIX",
            contexto: ["Viajes", "Prensa", "Tipos", "Cochrane"],
            procedencia: "Francia",
            regi??n: "Monta??as andinas Nueva Granada",
            lugar: "Camino del Quind??o", 
            src:"./imgs/37.png", 
            keyword: "cochrane",
            repositorio: "https://gallica.bnf.fr/ark:/12148/bpt6k104971v/f80.item",
            id: 36 
        },
        {
            t??tulo: "Carguero de la monta??a de Sons??n", 
            autor: "Ram??n Torres M??ndez",
            fecha: "1878",
            t??cnica: "litograf??a iluminada",
            dimensiones: "",
            fuente: "Sc??nes de la vie Colombi??ne, (Paris: Imprenta A Delarue, 1878)",
            descripci??n: "",
            periodo: "Segunda mitad siglo XIX",
            contexto: ["Arte", "Viajes", "Tipos", "Costumbres"],
            procedencia: "Francia",
            regi??n: "Monta??as andinas Nueva Granada",
            lugar: "Antioquia", 
            src:"./imgs/38.png", 
            keyword: "",
            repositorio: "",
            id: 37
        },
        {
            t??tulo: "Mi escribiente pasando una quebrada a espaldas de su pe??n carguero", 
            autor: "Jos?? Mar??a Guti??rrez de Alba",
            fecha: "1873",
            t??cnica: "Acuarela sobre papel gris",
            dimensiones: "18 x 15 cm",
            fuente: "	Tomo IX. Excursi??n al Caquet??. Del 28 de enero al 26 de mayo de 1873. Impresiones de un viaje en Am??rica (1970-1884)",
            descripci??n: "",
            periodo: "Segunda mitad siglo XIX",
            contexto: ["Viajes", "Diplomacia", "Tipos"],
            procedencia: "Espa??a",
            regi??n: "Monta??as andinas Nueva Granada",
            lugar: "Caquet??", 
            src:"./imgs/39.png", 
            keyword: "",
            repositorio: "https://www.banrepcultural.org/impresiones-de-un-viaje/index.php?r=laminas%2Fview&id=216&&&",
            id: 38
        },
        {
            t??tulo: "Camino y puente en la monta??a de Taman?? (Choc??). Puentes curiosos de Colombia N?? 3", 
            autor: "Jos?? Mar??a Guti??rrez de Alba",
            fecha: "1875",
            t??cnica: "Acuarela sobre papel gris",
            dimensiones: "21 x 16 cm",
            fuente: "Tomo XII. Ap??ndice. Maravillas y curiosidades de Colombia. Impresiones de un viaje en Am??rica (1970-1884)",
            descripci??n: "",
            periodo: "Segunda mitad siglo XIX",
            contexto: ["Viajes", "Diplomacia", "Tipos"],
            procedencia: "Espa??a",
            regi??n: "Monta??as andinas Nueva Granada",
            lugar: "Camino a N??vita, Choc??", 
            src:"./imgs/40.png", 
            keyword: "",
            repositorio: "https://babel.banrepcultural.org/digital/collection/p17054coll16/id/359",
            id: 39
        },
        {
            t??tulo: "Pe??n carguero de las tierras fr??as conduciendo una viajera por el p??ramo. Tipos colombianos N?? 12", 
            autor: "Jos?? Mar??a Guti??rrez de Alba",
            fecha: "1873",
            t??cnica: "Litograf??a iluminada a la acuarela",
            dimensiones: "	18 x 13 cm",
            fuente: "Tomo XII. Ap??ndice. Maravillas y curiosidades de Colombia. Impresiones de un viaje en Am??rica (1970-1884)",
            descripci??n: "",
            periodo: "Segunda mitad siglo XIX",
            contexto: ["Viajes", "Diplomacia", "Tipos", "Torres M??ndez"],
            procedencia: "Espa??a",
            regi??n: "Monta??as andinas Nueva Granada",
            lugar: "Tierras altas", 
            src:"./imgs/41.png", 
            keyword: "",
            repositorio: "https://babel.banrepcultural.org/digital/collection/p17054coll16/id/359",
            id: 40
        },
        {
            t??tulo: "Carguero du Quindio et sa silleta", 
            autor: "Edouard Andr??",
            fecha: "1879",
            t??cnica: "Grabado",
            dimensiones: "",
            fuente: "Tour du Monde, Nouveau Journal des Voyages 37, 1879",
            descripci??n: "",
            periodo: "Segunda mitad siglo XIX",
            contexto: ["Viajes", "Prensa", "Tipos"],
            procedencia: "Francia",
            regi??n: "Monta??as andinas Nueva Granada",
            lugar: "Camino del Quind??o", 
            src:"./imgs/42.png",
            keyword: "", 
            repositorio: "https://gallica.bnf.fr/ark:/12148/bpt6k34410z/f114.item",
            id: 41
        },
        {
            t??tulo: "La mont??e de l'Agonie",
            autor: "Edouard Andr??. Maillart(dibj.)",
            fecha: "1879",
            t??cnica: "Grabado",
            dimensiones: "",
            fuente: "Tour du Monde, Nouveau Journal des Voyages 38, 1879",
            descripci??n: "",
            periodo: "Segunda mitad siglo XIX",
            contexto: ["Viajes", "Prensa", "Tipos"],
            procedencia: "Francia",
            regi??n: "Frontera amaz??nica",
            lugar: "Putumayo",
            src:"./imgs/43.png", 
            keyword: "",
            repositorio: "https://gallica.bnf.fr/ark:/12148/bpt6k344119/f366.item",
            id: 42
        },    
        {
            t??tulo: "Voyage a dos d???indie",
            autor: "C. P. ??tienne",
            fecha: "1887",
            t??cnica: "Grabado",
            dimensiones: "",
            fuente: "Aper??u General sur la Colombie et recits de voyages en Am??rique, (Geneve: Impr. M. Richter, 1887)",
            descripci??n: "",
            periodo: "Segunda mitad del siglo XIX",
            contexto: ["Viajes", "Tipos"],
            procedencia: "Suiza",
            regi??n: "Monta??as andinas Nueva Granada",
            lugar: "Camino del Quind??o",
            src:"./imgs/44.png", 
            keyword: "roulin",
            repositorio: "",
            id: 43
        },
        {
            t??tulo: "The reconstruction policy of Congress, as illustrated in California",
            autor: "s/a",
            fecha: "1867.",
            t??cnica: "Litografia en papel tejido",
            dimensiones: "36.8 x 27.2 cm",
            fuente: "Library of Congress Prints and Photographs Division Washington, D.C. 20540 USA http://hdl.loc.gov/loc.pnp/p.print",
            descripci??n: "Una s??tira dirigida a la adhesi??n del candidato republicano a gobernador de California, George C. Gorham, a los derechos de voto de los negros y otras minor??as. El hermano Jonathan (izquierda) advierte a Gorham: '??Joven! Lee la historia de tu pa??s y aprende que esta urna electoral se dedic?? ??nicamente a la raza blanca. La carga que llevas te hundir?? en la perdici??n, a donde perteneces, o a mi nombre no es Jonathan'. Sostiene su mano protectoramente sobre una urna de vidrio, que se encuentra en un pedestal frente a ??l. En el centro est?? Gorham, cuyos hombros sostienen, uno encima del otro, a un hombre negro, un hombre chino y un guerrero indio.",
            periodo: "Segunda mitad siglo XIX",
            contexto: ["Caricatura", "Cr??tica social", "S??tira"],
            procedencia: "Estados Unidos",
            regi??n: "California",
            lugar: "California",
            src:"./imgs/45.png", 
            keyword: "",
            repositorio: "https://www.loc.gov/pictures/resource/ds.14037/",
            id: 44
        },
        {
            t??tulo: "[Hamal] ou portefaix",
            autor: "An??nimo",
            fecha: "Finales siglo XVIII",
            t??cnica: "Acuarela",
            dimensiones: "",
            fuente: "Recueil. Dessins originaux de costumes turcs : un recueil de dessins aquarelles. Paris, Biblioth??que nationale de France, Estampes et photographie, 4-OD-23",
            descripci??n: "",
            periodo: "Finales del siglo XVIII",
            contexto: ["Viajes", "Trajes", "Cargadores globales"],
            procedencia: "Francia",
            regi??n: "Imperio Otomano",
            lugar: "Turqu??a",
            src:"./imgs/46.png", 
            keyword: "",
            repositorio: "https://gallica.bnf.fr/ark:/12148/btv1b8455918s/f72.item",
            id: 45
        },
        {
            t??tulo: "F. 17. Chaise ?? Porteur ordinaire pour ceux qui n' ont acun rang. Rues de P??kin",
            autor: "Henri L??onard Jean-Baptiste Bertin",
            fecha: "1780?",
            t??cnica: "Acuarela",
            dimensiones: "",
            fuente: " Rues de P??kin. Biblioth??que nationale de France, d??partement Estampes et photographie, RESERVE OE-55-4",
            descripci??n: "",
            periodo: "Finales del siglo XVIII",
            contexto: ["Viajes", "Trajes", "Cargadores globales"],
            procedencia: "Francia",
            regi??n: "China",
            lugar: "Pekin",
            src:"./imgs/47.png", 
            keyword: "",
            repositorio: "https://gallica.bnf.fr/ark:/12148/btv1b8452126n/f49.item",
            id: 46
        },
        {
            t??tulo: "El ciego y el paralitico", 
            autor: "Johann Theodor de Bry",
            fecha: "1596",
            t??cnica: "Grabado",
            dimensiones: "",
            fuente: "Emblemata secularia mira et jucunda ... Weltliche, lustige newe Kunstst??ck der jetzigen Weltlauff f??rbildende (Fr??ncfort, 1596)",
            descripci??n: "",
            periodo: "finales del siglo XVI",
            contexto: ["Emblemas", "Alegor??a"],
            procedencia: "Alemania",
            regi??n: "Europa",
            lugar: "Fr??ncfort",
            src:"./imgs/48.jpg", 
            keyword: "",
            repositorio: "https://bildsuche.digitale-sammlungen.de/index.html?c=viewer&bandnummer=bsb00024751&pimage=00001&v=2p&nav=&l=es",
            id: 47
        },
        {
            t??tulo: "Joseph Brown en traje de montar",
            autor: "Jos?? Mar??a Groot",
            fecha: "s/f",
            t??cnica: "Acuarela y tinta sobre cart??n",
            dimensiones: "24.7 x 17.2cm",
            fuente: "Biblioteca del University College, Londres. MS ADD 302/6/2",
            descripci??n: "",
            periodo: "Primera mitad siglo XIX",
            contexto: ["Viajes", "Diplomacia", "Retrato", "Mulas"],
            procedencia: "Colombia",
            regi??n: "Monta??as andinas Nueva Granada",
            lugar: "",
            src:"./imgs/49.png", 
            keyword: "",
            repositorio: "",
            id: 1
        },    {
            t??tulo: "The Author in the Travelling Costume of the Country",
            autor: "Charles Stuart Cochrane",
            fecha: "1825",
            t??cnica: "Grabado",
            dimensiones: "",
            fuente: "Charles Stuart Cochrane, Journal of a Residence and Travels in Colombia, During the Years 1823 and 1824 (In Two volumes), (Londres: Henry Colburn, 1825)",
            descripci??n: "",
            periodo: "Primera mitad siglo XIX",
            contexto: ["Viajes", "Comercio", "Retrato", "Mulas"],
            procedencia: "Inglaterra",
            regi??n: "Monta??as andinas Nueva Granada",
            lugar: "",
            src:"./imgs/50.png", 
            keyword: "",
            repositorio: "https://archive.org/details/journalofresiden11825coch/page/n11/mode/2up",
            id: 1
        },
        {
            t??tulo: "Le Docteur Saffray",
            autor: "Charles Saffray. Alphonse Neuville (Dibj.)",
            fecha: "1873",
            t??cnica: "Grabado",
            dimensiones: "",
            fuente: "Charles Saffray, Voyage ?? la Nouvelle Grenade. Le Tour de monde, 26, 1973",
            descripci??n: "",
            periodo: "Segunda mitad siglo XIX",
            contexto: ["Viajes", "Prensa", "Retrato", "Mulas"],
            procedencia: "Francia",
            regi??n: "Monta??as andinas Nueva Granada",
            src:"./imgs/51.png", 
            keyword: "",
            repositorio: "https://gallica.bnf.fr/ark:/12148/bpt6k104971v/f108.item",
            id: 50
        },
        {
            t??tulo: "Carguero en la monta??a de Sons??n",
            autor: "Ram??n Torres M??ndez",
            fecha: "1910",
            t??cnica: "Grabado",
            dimensiones: "",
            fuente: "??lbum de costumbres colombianas. Seg??n dibujos del Se??or Ram??n Torres, Publicado por la Junta Nacional del Primer Centenario de la Proclamaci??n de la Independencia de la Rep??blica de Colombia. Edici??n Ed. Victor Sperling, Leipzig, 1910",
            descripci??n: "L??mina impresa en la edici??n de 1910 hecha para conmemorar el centenario del grito de la independencia. Este ejemplar se puso en la urna centenaria que fue abierta en el 2010 por Samuel Moreno Rojas y ??lvaro Uribe V??lez alcalde de Bogot?? y presidente de Colombia, respectivamente.",
            periodo: "Primera mitad siglo XX",
            contexto: ["Centenario", "Naci??n", "Costumbres", "Memoria"],
            procedencia: "Colombia",
            regi??n: "Monta??as andinas de Colombia",
            lugar: "Antioquia",
            src:"./imgs/52.png", 
            keyword: "",
            repositorio: "",
            id: 51
        },
        {
            t??tulo: "Carguero en la monta??a de Sons??n",
            autor: "Ram??n Torres M??ndez",
            fecha: "1934",
            t??cnica: "Grabado",
            dimensiones: "El grabado de Ram??n Tores M??ndez sirve como ilustraci??n de un relato de Manuel Mar??a Mallarino acerca de su experiencia atravesando en camino del Quind??o. El art??culo est?? en la secci??n p??ginas olvidadas de la revista Senderos, el ??rgano oficial de la Biblioteca Nacional a cargo de Daniel Samper Ortega",
            fuente: "Manuel Mar??a Mallarino. La muerte a cada paso. Senderos. Organo de la Biblioteca Nacional de Colombia, 1934",
            descripci??n: "",
            periodo: "Primera mitad siglo XX",
            contexto: ["Naci??n", "Costumbres", "Memoria"],
            procedencia: "Colombia",
            regi??n: "Monta??as andinas de Colombia",
            lugar: "Camino del Quind??o",
            src:"./imgs/53.png", 
            keyword: "",
            repositorio: "https://catalogoenlinea.bibliotecanacional.gov.co/client/es_ES/search/asset/137993",
            id: 52
        },
        {
            t??tulo: "Chircales",
            autor: "Marta Rodr??guez. Jorge Silva",
            fecha: "1966-1971",
            t??cnica: "Fotograma de Cortometraje, 16mm",
            dimensiones: "",
            fuente: "",
            descripci??n: "",
            periodo: "Segunda mitad siglo XX",
            contexto: ["Cinematograf??a", "Documental", "Cr??tica social"],
            procedencia: "Colombia",
            regi??n: "Monta??as andinas de Colombia",
            lugar: "Bogot??",
            src:"./imgs/54.png", 
            keyword: "",
            repositorio: "https://www.proimagenescolombia.com/secciones/cine_colombiano/peliculas_colombianas/pelicula_plantilla.php?id_pelicula=1566",
            id: 53
        },
        {
            t??tulo: "Adelante",
            autor: "Grosso",
            fecha: "1984",
            t??cnica: "Impreso, Caricatura",
            dimensiones: "",
            fuente: "El Tiempo, Bogot??, marzo de 1984",
            descripci??n: "",
            periodo: "Segunda mitad siglo XX",
            contexto: ["Prensa", "Caricatura", "Cr??tica social", "S??tira"],
            procedencia: "Colombia",
            regi??n: "Bogot??",
            lugar: "Bogot??",
            src:"./imgs/55.png", 
            keyword: "",
            repositorio: "",
            id: 54
        },
        {
            t??tulo: "Camino a N??vita en la monta??a de Taman??. Enciclopedia Salvat",
            autor: "Atribuido err??neamente a Manuel Mar??a Paz",
            fecha: "1977",
            t??cnica: "Impreso",
            dimensiones: "",
            fuente: "Enciclopedia de arte colombiano Salvat, volumen VII, Colombia pintoresca.",
            descripci??n: "Se pone en el contexto de un discurso sobre el 'arte nacional'. 'Esta l??mina, por cierto graciosa y realista, ha sido reproducida repetidas veces como ejemplo que encarna lo testimonial y de ingenua concepci??n, caracter??sticas no s??lo de Paz, sino tambi??n de otros artistas de la Comisi??n corogr??fica'. En la introducci??n de la obra se evidencia un modo teleol??gico de tramar la historia: 'esos hombres consiguieron dejarnos esa deliciosa visi??n de una Colombia pintoresca, viva, llena a veces de grandes contrastes fecundos, de horizontes prometedores, de hombres y de mujeres que ya ten??an conciencia de que estaban empezando, solos, una larga y venturosa andadura'",
            periodo: "Segunda mitad siglo XX",
            contexto: ["Arte", "Naci??n", "Memoria"],
            procedencia: "",
            regi??n: "",
            lugar: "",
            src:"./imgs/56.png", 
            keyword: "",
            repositorio: "",
            id: 55
        },
        {
            t??tulo: "Portada Imperial Eyes",
            autor: "Mary Louis Pratt",
            fecha: "1992",
            t??cnica: "Portada",
            dimensiones: "",
            fuente: "Mary Louis Pratt, Imperial eyes. TRavel writing and transculturation, (Londres, Nueva York: Routledge, 1992)",
            descripci??n: "Imagen tomada de la l??mina ???El monte de la Agon??a de Edouard Andr??, 1879. Publicada en Le tour de monde. La imagen es de una ??poca posterior a la trabajada por Pratt en su libro. En la edici??n en espa??ol de 2011 est?? l??mita ilsutra el cap??tulo sobre los viajeros de la primera mitad del siglo XIX como vanguardia del capitalismo y de la extensi??n imperial",
            periodo: "Segunda mitad siglo XX",
            contexto: ["Academia", "Antropolog??a", "Literatura comparada","Decolonialidad"],
            procedencia: "Estados Unidos",
            regi??n: "Monta??as andinas de Colombia",
            lugar: "",
            src:"./imgs/57.png", 
            keyword: "",
            repositorio: "https://openlibrary.org/works/OL4095821W/Imperial_eyes",
            id: 56
        },
        {
            t??tulo: "s/t. Auguste Le Moyne. El rev??s de la naci??n",
            autor: "Margarita Serje de la Osa",
            fecha: "2011",
            t??cnica: "L??mina de libro",
            dimensiones: "",
            fuente: "El rev??s de la naci??n. Territorios salvajes, fronteras y tierras de nadie (Bogot??: Universidad de los Andes, 2011)",
            descripci??n: "Tomada de la l??mina de Le Moyne, 1828. El carguero es usado como una figura, semejante a la de los colono de la frontera fluida que los discursos que justifican la intervenci??n estatal suelen representar como 'bald??a'.",
            periodo: "Siglo XXI",
            contexto: ["Academia", "Antropolog??a", "Decolonialidad"],
            procedencia: "Colombia",
            regi??n: "Fronteras, bald??os, tierras salvajes",
            lugar: "",
            src:"./imgs/58.png", 
            keyword: "",
            repositorio: "https://appsciso.uniandes.edu.co/sip/data/pdf/El%20Reves%20de%20la%20Nacion%20final.pdf",
            id: 57
        },
        {
            t??tulo: "Portada del libro ???Por los llanos del Piedemonte",        autor: "Carl Henrik LangebaekSantiago Giraldo, Alejandro Bernal, Silvia Monroy, Andr??s Barrag??n",
            fecha: "200",
            t??cnica: "Portada de libro",
            dimensiones: "",
            fuente: "Por los caminos del Piedemonte. Una historia de las comunicaciones entre los Andes Orientales y los Llanos. Siglos XVI a XIX",
            descripci??n: "Usan la imagen de carguero atribuida a Manuel Mar??a Paz de 1853. Es una imagen del viaje de la Comisi??n corogr??fica al Choc?? para un libro que se refiere a los andes orientales y los llanos, (Bogot??: Universidad de los Andes, 2000)",
            periodo: "Siglo XXI",
            contexto: ["Academia", "Antropolog??a", "Arqueolog??a"],
            procedencia: "Colombia",
            regi??n: "Monta??s Andinas de Colombia",
            lugar: "Pie de monte llanos orientales",
            src:"./imgs/59.png", 
            keyword: "",
            repositorio: "https://cienciassociales.uniandes.edu.co/antropologia/publicaciones/por-los-caminos-del-piedemonte-una-historia-de-las-comunicaciones-entre-los-andes-orientales-y-los-llanos-siglos-xvi-a-xix/",
            id: 58
        },
        {
            t??tulo: "Afiche Maestr??a en Historia Universidad Tecnol??gica de Pereira",
            autor: "Universidad Tecnol??gica de Pereira",
            fecha: "2018",
            t??cnica: "Afiche publicitario",
            dimensiones: "",
            fuente: "P??gina Web Universidad Tecnol??gica de Pereira",
            descripci??n: "",
            periodo: "Siglo XXI",
            contexto: ["Academia", "Publicidad", "Historia"], 
            procedencia: "Colombia",
            regi??n: "Identidad regional Antioquia y Eje cafetero",
            lugar: "Pereira",
            src:"./imgs/60.png", 
            keyword: "",
            repositorio: "https://comunicaciones.utp.edu.co/noticias/37593/inscripciones-abiertas-maestria-en-historia",
            id: 59
        },
        {
            t??tulo: "Logo de la Maestr??a en Historia, Universidad Tecnol??gica de Pereira",
            autor: "Universidad Tecnol??gica de Pereira",
            fecha: "2019",
            t??cnica: "Logo",
            dimensiones: "",
            fuente: "P??gina Web Universidad Tecnol??gica de Pereira",
            descripci??n: "",
            periodo: "Siglo XXI",
            contexto: ["Academia", "Publicidad", "Historia"],
            procedencia: "Colombia",
            regi??n: "Identidad regional Antioquia y Eje cafetero",
            lugar: "Pereira",
            src:"./imgs/61.png", 
            keyword: "",
            repositorio: "https://comunicaciones.utp.edu.co/noticias/51243/leccion-inaugural-maestria-en-historia-con-la-comision-de-la-verdad",
            id: 60
        },
        {
            t??tulo: "Cartel convocatoria Revista H-art. Dossier: Colombia, siglo XIX: viajes, intercambios y otras formas de circulaci??n.",
            autor: "Revista H-art, Universidad de los Andes",
            fecha: "2019",
            t??cnica: "Afiche publicitario",
            dimensiones: "",
            fuente: "P??gina web Revista H-art Universidad de los Andes",
            descripci??n: "",
            periodo: "Siglo XXI",
            contexto: ["Academia", "Publicidad", "Historia", "Historia del arte", "Literatura"],
            procedencia: "Colombia",
            regi??n: "Bogot??",
            lugar: "Bogot??",
            src:"./imgs/62.png", 
            keyword: "",
            repositorio: "https://facartes.uniandes.edu.co/convocatorias/convocatoria-dossier-colombia-siglo-xix-viajes-intercambios-y-otras-formas-de-circulacion/",
            id: 61
        },
        {
            t??tulo: "Cartel del I Simposio internacional Colombia, siglo XIX: viajes, intercambios y otras formas de circulaci??n",
            autor: "Universidad de los Andes",
            fecha: "2019",
            t??cnica: "Afiche publicitario",
            dimensiones: "",
            fuente: "Facultad de Artes y Humanidades. Facultad de Ciencias Sociales. Universidad de los Andes",
            descripci??n: "",
            periodo: "Siglo XXI",
            contexto: ["Academia", "Publicidad", "Historia", "Historia del arte", "Literatura"],
            procedencia: "Colombia",
            regi??n: "Bogot??",
            lugar: "Bogot??",
            src:"./imgs/63.png", 
            keyword: "",
            repositorio: "https://facartes.uniandes.edu.co/calendario/simposio-colombia-xix/",
            id: 62
        },
        {
            t??tulo: "Cartel del XIX Congreso colombiano de Historia",
            autor: "Academia de Historia del Quind??o",
            fecha: "2019",
            t??cnica: "Afiche publicitario",
            dimensiones: "",
            fuente: "P??gina Web XIX Congreso colombiano de Historia",
            descripci??n: "",
            periodo: "Siglo XXI",
            contexto: ["Academia", "Publicidad", "Historia"],
            procedencia: "Colombia",
            regi??n: "Identidad regional Antioquia y Eje cafetero",
            lugar: "Armenia",
            src:"./imgs/64.png", 
            keyword: "",
            repositorio: "https://asocolhistoria.org/xix-congreso-colombiano-de-historia/",
            id: 63
        },
        {
            t??tulo: "Hombres bestia",
            autor: "Carlos Albero Osorio Monsalve. Osori??n",
            fecha: "2013",
            t??cnica: "Dibujo",
            dimensiones: "",
            fuente: "Blog Osori??n. Carlos Osorio",
            descripci??n: "",
            periodo: "Siglo XXI",
            contexto: ["Naci??n", "Regi??n", "Memoria"],
            procedencia: "Colombia",
            regi??n: "Antioquia",
            lugar: "Antioquia",
            src:"./imgs/65.png", 
            keyword: "",
            repositorio: "http://laobradeosorio.blogspot.com/2014_03_01_archive.html",
            id: 64
        },
        {
            t??tulo: "El silletero",
            autor: "Pascal Tissot",
            fecha: "2005",
            t??cnica: "Escultura",
            dimensiones: "100 x 190 cm",
            fuente: "P??gina Web del artista",
            descripci??n: "",
            periodo: "Siglo XXI",
            contexto: ["Arte", "Naci??n", "Memoria"],  
            procedencia: "Colombia",
            regi??n: "",
            lugar: "",
            src:"./imgs/66.png", 
            keyword: "",
            repositorio: "https://www.artelista.com/obra/9478059898112354-elsilletero.html",
            id: 65
        },
        {
            t??tulo: "Im??genes del desfile de inauguraci??n del festival iberoamericano de teatro",
            autor: "Comparsa del Quind??o",
            fecha: "2012",
            t??cnica: "Esc??nica",
            dimensiones: "",
            fuente: "Festival Iberoamericano de Teatro",
            descripci??n: "",
            periodo: "Siglo XXI",
            contexto: ["Arte", "Teatro", "Naci??n", "Regi??n", "Memoria"], 
            procedencia: "Colombia",
            regi??n: "Monta??as andinas de Colombia",
            lugar: "Camino del Quind??o",
            src:"./imgs/67.png", 
            keyword: "",
            repositorio: "",
            id: 66
        },
        {
            t??tulo: "Z??calo Guatape",
            autor: "An??nimo",
            fecha: "s/f",
            t??cnica: "Mural",
            dimensiones: "",
            fuente: "Fotograf??a tomada por Juan Felipe Urue??a",
            descripci??n: "",
            periodo: "Siglo XX",
            contexto: ["Arte", "Arte popular", "Naci??n", "Regi??n", "Memoria"],
            procedencia: "Colombia",
            regi??n: "Monta??as andinas de Colombia",
            lugar: "Antioquia",
            src:"./imgs/68.png", 
            keyword: "",
            repositorio: "",
            id: 67
        },
        {
            t??tulo: "Z??calo Guatape",
            autor: "An??nimo",
            fecha: "s/f",
            t??cnica: "Mural",
            dimensiones: "",
            fuente: "Fotograf??a tomada por Juan Felipe Urue??a",
            descripci??n: "",
            periodo: "Siglo XX",
            contexto: ["Arte", "Arte popular", "Naci??n", "Regi??n", "Memoria"],
            procedencia: "Colombia",
            regi??n: "Monta??as andinas de Colombia",
            lugar: "Antioquia",
            src:"./imgs/69.png", 
            keyword: "",
            repositorio: "",
            id: 68
        },
        {
            t??tulo: "Por los caminos del Quind??o (Detalle)",
            autor: "Henry Villada",
            fecha: "2017",
            t??cnica: "Mural",
            dimensiones: "",
            fuente: "Fotograf??a tomada por Juan Felipe Urue??a",
            descripci??n: "El carguero est?? incluido en una secuencia narrativa que muestra una evoluci??n progresiva que va desde los cargueros en un contexto agreste, pasando por los arrieros con sus mulas, llegando al Jeep Willis en un contexto colonizado que se ilustra con las t??picas casas de las fincas cafeteras. El mural ha tomado como modelo de algunas de sus escenas, l??minas de viajeros del siglo XIX. Una reproducida en el libro de John Porter Hamilton, y otra elaborada por Roulin que se refiere originalmente al camino Honda-Guaduas.",
            periodo: "Siglo XX",
            contexto: ["Arte", "Naci??n", "Regi??n", "Memoria"],
            procedencia: "Colombia",
            regi??n: "Monta??as andinas de Colombia",
            lugar: "Antioquia",
            src:"./imgs/70.jpg", 
            keyword: "",
            repositorio: "",
            id: 69
        },
        {
            t??tulo: "Silla",
            autor: "s/a",
            fecha: "s/f",
            t??cnica: "Silla construida con bamb??",
            dimensiones: "",
            fuente: "Fotograf??a tomada del blog de la Academia de Historia del Quind??o",
            descripci??n: " Armaz??n de guadua (latas de guadua), cuyas medidas eran: de unos tres pies (91cms), largo, y de ancho, un pie (31.5 cms), ensambladas y amarradas entre s?? con bejucos, provista de espaldar con una inclinaci??n de 60??, con el fin de que el transportado pudiera juntar su espalda con la espalda del sillero.  En la parte baja de la silla se amarra una tabla, en ??ngulo recto, que tiene las mismas dimensiones del ancho. Vista as??, toda la estructura semeja una silla sin patas.Dos fuertes pretinas a manera de arn??s, situadas en los extremos de ambos bastidores de la silla, manten??an todo en ??ngulo recto, sirviendo al propio tiempo de brazos a los que el viajero pod??a asirse. Un pedazo de bamb?? de un pie de largo, colgaba en su parte inferior y le serv??a como estribo, si es que el acarreado pod??a considerarse como un jinete de caballer??a.", 
            periodo: "Siglo XXI",
            contexto: ["Arte", "Arte popular", "Naci??n", "Regi??n", "Memoria"],
            procedencia: "Colombia",
            regi??n: "Monta??as andinas de Colombia",
            lugar: "Camino del Quind??o",
            src:"./imgs/71.png", 
            keyword: "",
            repositorio: "http://academiadehistoriadelquindio.blogspot.com/2018/04/silleteros-y-cargueros-microhistorias.html",
            id: 70
        },
        {
            t??tulo: "Logo de la Academia de Historia del Quind??o",
            autor: "s/a",
            fecha: "s/f",
            t??cnica: "Logo",
            dimensiones: "",
            fuente: "Tomado del blog de la Academia de Historia del Quind??o",
            descripci??n: "",
            periodo: "Siglo XX",
            contexto: ["Regi??n", "Naci??n", "Memoria"],
            procedencia: "Colombia",
            regi??n: "Monta??as andinas de Colombia",
            lugar: "Camino del Quind??o",
            src:"./imgs/72.png", 
            keyword: "",
            repositorio: "http://academiadehistoriadelquindio.blogspot.com/",
            id: 71
        },
        {
            t??tulo: "Colombia de Reojo",
            autor: "Santiago Hacker",
            fecha: "2014",
            t??cnica: "Serie fotogr??fica",
            dimensiones: "",
            fuente: "Fotograf??a tomada por Juan Felipe Urue??a",
            descripci??n: "Santiago Harker sigui?? los pasos de la Comisi??n Corogr??fica. Tomando fotografias que establcen correspondencias visuales, tem??ticas y geogr??ficas con las l??minas de la Comisi??n Corogr??fica ",
            periodo: "Siglo XXi",
            contexto: ["Arte", "Arte contempor??neo", "Fotograf??a", "Naci??n", "Memoria"],
            procedencia: "Colombia",
            regi??n: "Monta??as andinas de Colombia",
            lugar: ["Camino del Quind??o", "Antioquia"],
            src:"./imgs/73.png", 
            keyword: "",
            repositorio: "",
            id: 72
        },
        {
            t??tulo: "La sombra del caminante",
            autor: "Ciro Guerra (Director)",
            fecha: "2004",
            t??cnica: "Largometraje argumental",
            dimensiones: "",
            fuente: "Proim??genes, 2004",
            descripci??n: "",
            periodo: "Siglo XX",
            contexto: ["Arte", "Cinemotograf??a", "Memoria", "Conflicto armado", "Naci??n"],
            procedencia: "Colombia",
            regi??n: "Monta??as andinas de Colombia",
            lugar: "Bogot??",
            src:"./imgs/74.png", 
            keyword: "",
            repositorio: "https://www.proimagenescolombia.com//secciones/cine_colombiano/peliculas_colombianas/pelicula_plantilla.php?id_pelicula=274",
            id: 73
        },
        {
            t??tulo: "Carguero. Rappi",
            autor: "Luis Fernando Medina. #Luscus",
            fecha: "2019",
            t??cnica: "Calcoman??a. Fotomontaje",
            dimensiones: "",
            fuente: "Paro nacional de noviembre de 2019",
            descripci??n: "",
            periodo: "Siglo XXI",
            contexto: ["Arte", "Arte callejero", "Cr??tica social", "S??tira"],
            procedencia: "Colombia",
            regi??n: "Monta??as andinas de Colombia",
            lugar: "Bogot??",
            src:"./imgs/75.png", 
            keyword: "",
            repositorio: "",
            id: 74
        },
        {
            t??tulo: "Meme",
            autor: "An??nimo",
            fecha: "2019",
            t??cnica: "Meme. Fotomontaje",
            dimensiones: "",
            fuente: "Twitter",
            descripci??n: "Meme que muestra la gram??tica espacial del arriba/abajo, el cargador y cargado, y su potencial para hacer s??tira social.",
            periodo: "Siglo XXI",
            contexto: ["Arte", "Memes", "Cr??tica social", "S??tira"],
            procedencia: "Colombia",
            regi??n: "Monta??as andinas de Colombia",
            lugar: "Bogot??",
            src:"./imgs/76.png", 
            keyword: "",
            repositorio: "",
            id: 75
        },    {
            t??tulo: "El paso del Quind??o",
            autor: "Alejandro Gaviria",
            fecha: "2010",
            t??cnica: "Art??culo de opini??n",
            dimensiones: "",
            fuente: "El Espectador 11 Dic. 2010.",
            descripci??n: "Alejandro Gaviria usa a los cargueros y su traves??a por el paso del Quind??o como met??fora para discutir sobre la lentitud de la ejecuci??n de las obras p??blicas en Colombia",
            periodo: "Siglo XXI",
            contexto: ["Prensa", "Naci??n"],
            procedencia: "Colombia",
            regi??n: "Monta??as andinas de Colombia",
            lugar: "Camino del Quind??o",
            src:"./imgs/77.png", 
            keyword: "",
            repositorio: "https://www.elespectador.com/opinion/columnistas/alejandro-gaviria/el-paso-del-quindio-column-239854/",
            id: 76
        },
        {
            t??tulo: "Reacciones de tuiteros",
            autor: ["Madame Simone", "Laura Quintana", "Lucas Ospina", "Roberto Angulo"],
            fecha: "2019",
            t??cnica: "Tweet",
            dimensiones: "",
            fuente: "Twitter",
            descripci??n: "Tuiteros reaccionan ante un video en el que la senadora del Centro Democr??tico Mar??a del Rosario Guerra paga a un transeunte para que la cargue a trav??s de una calle innundada",
            periodo: "Siglo XXI",
            contexto: ["Redes sociales", "Cr??tica social", "Decolonialidad"],
            procedencia: "Colombia",
            regi??n: "Monta??as andinas de Colombia",
            lugar: "Bogot??",
            src:"./imgs/78.png", 
            keyword: "",
            repositorio: "https://www.proimagenescolombia.com//secciones/cine_colombiano/peliculas_colombianas/pelicula_plantilla.php?id_pelicula=274",
            id: 77
        },
        {
            t??tulo: "Paso del Quind??o II",
            autor: "Jos?? Alejandro Restrepo",
            fecha: "2007",
            t??cnica: "Videoinstalaci??n",
            dimensiones: "",
            fuente: "Jos?? Alejandro Restrepo, ???Viajes parad??jicos???, Arte y etnograf??a. De artistas, textos, contextos, mapeos y paseantes, editado por Pedro Pablo G??mez, (Bogot??: Universidad Distrital,  2007) 45-52",
            descripci??n: "Jos?? Alejandro Restrepo, ???Viajes parad??jicos???, Arte y etnograf??a. De artistas, textos, contextos, mapeos y paseantes, editado por Pedro Pablo G??mez, (Bogot??: Universidad Distrital,  2007) 45-52",
            periodo: "Siglo XXI",
            contexto: ["Arte", "Arte Contempor??neo", "Videoarte", "Decolonialidad", "Memoria"],
            procedencia: "Colombia",
            regi??n: "Monta??as andinas de Colombia",
            lugar: "Serran??a del Baud??, Choc??",
            src:"./imgs/79.png", 
            keyword: "",
            repositorio: "http://www.colarte.com/colarte/foto.asp?ver=1&idfoto=330895",
            id: 78
        },
        {
            t??tulo: "La naturaleza de las cosas: Humboldt, idas y venidas",
            autor: "Halim Badawi (Curador)",
            fecha: "2019",
            t??cnica: "Exposici??n de arte",
            dimensiones: "",
            fuente: "Museo de Arte, Universidad Nacional de Colombia",
            descripci??n: "",
            periodo: "Siglo XXI",
            contexto: ["Arte", "Arte Contenmpor??neo", "Memoria", "Decolonialidad"],
            procedencia: "Colombia",
            regi??n: ["Monta??as andinas de Colombia", ""],
            lugar: "Bogot??",
            src:"./imgs/80.png", 
            keyword: "",
            repositorio: "https://www.youtube.com/watch?v=w5rcUiGKtcc",
            id: 79
        },
        {
            t??tulo: "El reverso oscuro de la ciencia ilustrada. La naturaleza de las cosas: Humboldt idas y venidas.",
            autor: "Felipe S??nchez Villareal",
            fecha: "2019",
            t??cnica: "Rese??a Exposici??n de arte",
            dimensiones: "",
            fuente: "Semana 9 de mayo, 2019",
            descripci??n: "",
            periodo: "Siglo XXI",
            contexto: ["Arte", "Arte Contempor??neo", "Memoria", "Decolonialidad"],
            procedencia: "Colombia",
            regi??n: "Monta??as andinas de Colombia",
            lugar: "Bogot??",
            src:"./imgs/81.png", 
            keyword: "",
            repositorio: "https://www.semana.com/arte/articulo/el-reverso-oscuro-de-la-ciencia-ilustrada-la-naturaleza-de-las-cosas-humboldt-idas-y-venidas/75407/",
            id: 80
        },
        {
            t??tulo: "El carguero",
            autor: "Jean Lucumi",
            fecha: "2019",
            t??cnica: "Performance de larga duraci??n",
            dimensiones: "",
            fuente: "Laboratorio de creaci??n Experimenta SUR 2019",
            descripci??n: "Estas son las palabras del artista: '(???) Con esto recuerdo que alguien me pregunto si esa labor del carguero a??n exist??a, mi respuesta fue que s??, cada persona que trabaja en una constructora y lleva sobre sus hombros bultos de cemento es un carguero, cada persona que ayuda a descargar bultos de comida en una plaza de mercado, por una paga que no es muy buena es un carguero, no lo mal entiendan, no estoy des-meritando la labor del carguero, es m??s un asunto de encontrar la manera de narrarlo sin ponerlo a repetir la l??gica colonial de cosificarlo y validarlo desde eso que se espera soporte con su cuerpo'.",
            periodo: "Siglo XXI",
            contexto: ["Arte", "Arte Contempor??neo", "Performance", "Memoria", "Decolonialidad"],
            procedencia: "Colombia",
            regi??n: "Monta??as andinas de Colombia",
            lugar: "Bogot??",
            src:"./imgs/82.png", 
            keyword: "",
            repositorio: "https://vimeo.com/336947635",
            id: 81
        },
        {
            t??tulo: "Gold in the morning",
            autor: "Alfredo Jaar",
            fecha: "1985",
            t??cnica: "Fotograf??a en tres cajas de luz",
            dimensiones: "25 x 40 cm ",
            fuente: "Colecci??n Proyecto Bachu??, Bogot??. Foto: Goethe-Institut/Urniator Studio, Juan David Padilla Vega",
            descripci??n: "Esta obra fue expuesta en la Exposici??n La naturaleza de las cosas: Humboldt, idas y venidas",
            periodo: "Siglo XXI",
            contexto: ["Arte", "Arte Contempor??neo", "Memoria", "Decolonialidad"],
            procedencia: "Chile",
            regi??n: "Brazil",
            lugar: "Minas de oro, Serra Pelada",
            src:"./imgs/83.png", 
            keyword: "",
            repositorio: "https://www.proimagenescolombia.com//secciones/cine_colombiano/peliculas_colombianas/pelicula_plantilla.php?id_pelicula=274",
            id: 82
        }        
    ];

    /* src/components/Gallery.svelte generated by Svelte v3.50.1 */

    const file$1 = "src/components/Gallery.svelte";

    function create_fragment$1(ctx) {
    	let div;
    	let current;
    	const default_slot_template = /*#slots*/ ctx[1].default;
    	const default_slot = create_slot(default_slot_template, ctx, /*$$scope*/ ctx[0], null);

    	const block = {
    		c: function create() {
    			div = element("div");
    			if (default_slot) default_slot.c();
    			attr_dev(div, "class", "row svelte-vn591k");
    			add_location(div, file$1, 5, 0, 22);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);

    			if (default_slot) {
    				default_slot.m(div, null);
    			}

    			current = true;
    		},
    		p: function update(ctx, [dirty]) {
    			if (default_slot) {
    				if (default_slot.p && (!current || dirty & /*$$scope*/ 1)) {
    					update_slot_base(
    						default_slot,
    						default_slot_template,
    						ctx,
    						/*$$scope*/ ctx[0],
    						!current
    						? get_all_dirty_from_scope(/*$$scope*/ ctx[0])
    						: get_slot_changes(default_slot_template, /*$$scope*/ ctx[0], dirty, null),
    						null
    					);
    				}
    			}
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(default_slot, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(default_slot, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    			if (default_slot) default_slot.d(detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$1.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$1($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('Gallery', slots, ['default']);
    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console.warn(`<Gallery> was created with unknown prop '${key}'`);
    	});

    	$$self.$$set = $$props => {
    		if ('$$scope' in $$props) $$invalidate(0, $$scope = $$props.$$scope);
    	};

    	return [$$scope, slots];
    }

    class Gallery extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$1, create_fragment$1, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Gallery",
    			options,
    			id: create_fragment$1.name
    		});
    	}
    }

    /* src/App.svelte generated by Svelte v3.50.1 */

    const { console: console_1 } = globals;
    const file = "src/App.svelte";

    function get_each_context(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[2] = list[i].t??tulo;
    	child_ctx[3] = list[i].autor;
    	child_ctx[4] = list[i].fecha;
    	child_ctx[5] = list[i].t??cnica;
    	child_ctx[6] = list[i].fuente;
    	child_ctx[7] = list[i].src;
    	child_ctx[8] = list[i].keyword;
    	child_ctx[9] = list[i].contexto;
    	child_ctx[10] = list[i].procedencia;
    	child_ctx[11] = list[i].descripci??n;
    	return child_ctx;
    }

    // (37:2) {:else}
    function create_else_block(ctx) {
    	let div1;
    	let div0;
    	let img;
    	let img_src_value;
    	let t0;
    	let h30;
    	let t1_value = /*t??tulo*/ ctx[2] + "";
    	let t1;
    	let t2;
    	let h31;
    	let t3_value = /*autor*/ ctx[3] + "";
    	let t3;
    	let t4;
    	let p;
    	let t5_value = /*fecha*/ ctx[4] + "";
    	let t5;
    	let t6;
    	let t7_value = /*t??cnica*/ ctx[5] + "";
    	let t7;
    	let t8;
    	let br;
    	let t9;
    	let t10_value = /*fuente*/ ctx[6] + "";
    	let t10;
    	let t11;

    	const block = {
    		c: function create() {
    			div1 = element("div");
    			div0 = element("div");
    			img = element("img");
    			t0 = space();
    			h30 = element("h3");
    			t1 = text(t1_value);
    			t2 = space();
    			h31 = element("h3");
    			t3 = text(t3_value);
    			t4 = space();
    			p = element("p");
    			t5 = text(t5_value);
    			t6 = text(", \n\t\t\t\t");
    			t7 = text(t7_value);
    			t8 = text(".\n\t\t\t\t");
    			br = element("br");
    			t9 = text("\n\t\t\t\tFuente: ");
    			t10 = text(t10_value);
    			t11 = space();
    			if (!src_url_equal(img.src, img_src_value = /*src*/ ctx[7])) attr_dev(img, "src", img_src_value);
    			attr_dev(img, "alt", /*t??tulo*/ ctx[2]);
    			set_style(img, "width", "100%");
    			attr_dev(img, "class", "svelte-18w1of7");
    			add_location(img, file, 39, 5, 864);
    			attr_dev(h30, "class", "svelte-18w1of7");
    			add_location(h30, file, 40, 5, 918);
    			attr_dev(h31, "class", "svelte-18w1of7");
    			add_location(h31, file, 41, 5, 941);
    			attr_dev(br, "class", "svelte-18w1of7");
    			add_location(br, file, 45, 4, 1000);
    			attr_dev(p, "class", "svelte-18w1of7");
    			add_location(p, file, 42, 5, 963);
    			attr_dev(div0, "class", "content svelte-18w1of7");
    			add_location(div0, file, 38, 3, 837);
    			attr_dev(div1, "class", "column svelte-18w1of7");
    			attr_dev(div1, "keyword", /*keyword*/ ctx[8]);
    			toggle_class(div1, "show", /*selected*/ ctx[0] === /*keyword*/ ctx[8]);
    			add_location(div1, file, 37, 2, 769);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div1, anchor);
    			append_dev(div1, div0);
    			append_dev(div0, img);
    			append_dev(div0, t0);
    			append_dev(div0, h30);
    			append_dev(h30, t1);
    			append_dev(div0, t2);
    			append_dev(div0, h31);
    			append_dev(h31, t3);
    			append_dev(div0, t4);
    			append_dev(div0, p);
    			append_dev(p, t5);
    			append_dev(p, t6);
    			append_dev(p, t7);
    			append_dev(p, t8);
    			append_dev(p, br);
    			append_dev(p, t9);
    			append_dev(p, t10);
    			append_dev(div1, t11);
    		},
    		p: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div1);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_else_block.name,
    		type: "else",
    		source: "(37:2) {:else}",
    		ctx
    	});

    	return block;
    }

    // (23:2) {#if selected === "todas"}
    function create_if_block(ctx) {
    	let div1;
    	let div0;
    	let img;
    	let img_src_value;
    	let t0;
    	let h30;
    	let t1_value = /*t??tulo*/ ctx[2] + "";
    	let t1;
    	let t2;
    	let h31;
    	let t3_value = /*autor*/ ctx[3] + "";
    	let t3;
    	let t4;
    	let p;
    	let t5_value = /*fecha*/ ctx[4] + "";
    	let t5;
    	let t6;
    	let t7_value = /*t??cnica*/ ctx[5] + "";
    	let t7;
    	let t8;
    	let br;
    	let t9;
    	let t10_value = /*fuente*/ ctx[6] + "";
    	let t10;
    	let t11;

    	const block = {
    		c: function create() {
    			div1 = element("div");
    			div0 = element("div");
    			img = element("img");
    			t0 = space();
    			h30 = element("h3");
    			t1 = text(t1_value);
    			t2 = space();
    			h31 = element("h3");
    			t3 = text(t3_value);
    			t4 = space();
    			p = element("p");
    			t5 = text(t5_value);
    			t6 = text(", \n\t\t\t\t");
    			t7 = text(t7_value);
    			t8 = text(".\n\t\t\t\t");
    			br = element("br");
    			t9 = text("\n\t\t\t\tFuente: ");
    			t10 = text(t10_value);
    			t11 = space();
    			if (!src_url_equal(img.src, img_src_value = /*src*/ ctx[7])) attr_dev(img, "src", img_src_value);
    			attr_dev(img, "alt", /*t??tulo*/ ctx[2]);
    			set_style(img, "width", "100%");
    			attr_dev(img, "class", "svelte-18w1of7");
    			add_location(img, file, 25, 5, 566);
    			attr_dev(h30, "class", "svelte-18w1of7");
    			add_location(h30, file, 26, 5, 620);
    			attr_dev(h31, "class", "svelte-18w1of7");
    			add_location(h31, file, 27, 5, 643);
    			attr_dev(br, "class", "svelte-18w1of7");
    			add_location(br, file, 31, 4, 702);
    			attr_dev(p, "class", "svelte-18w1of7");
    			add_location(p, file, 28, 5, 665);
    			attr_dev(div0, "class", "content svelte-18w1of7");
    			add_location(div0, file, 24, 3, 539);
    			attr_dev(div1, "class", "column " + /*keyword*/ ctx[8] + " show" + " svelte-18w1of7");
    			add_location(div1, file, 23, 2, 500);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div1, anchor);
    			append_dev(div1, div0);
    			append_dev(div0, img);
    			append_dev(div0, t0);
    			append_dev(div0, h30);
    			append_dev(h30, t1);
    			append_dev(div0, t2);
    			append_dev(div0, h31);
    			append_dev(h31, t3);
    			append_dev(div0, t4);
    			append_dev(div0, p);
    			append_dev(p, t5);
    			append_dev(p, t6);
    			append_dev(p, t7);
    			append_dev(p, t8);
    			append_dev(p, br);
    			append_dev(p, t9);
    			append_dev(p, t10);
    			append_dev(div1, t11);
    		},
    		p: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div1);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block.name,
    		type: "if",
    		source: "(23:2) {#if selected === \\\"todas\\\"}",
    		ctx
    	});

    	return block;
    }

    // (22:2) {#each images as {t??tulo, autor, fecha, t??cnica, fuente, src, keyword, contexto, procedencia, descripci??n}}
    function create_each_block(ctx) {
    	let if_block_anchor;

    	function select_block_type(ctx, dirty) {
    		if (/*selected*/ ctx[0] === "todas") return create_if_block;
    		return create_else_block;
    	}

    	let current_block_type = select_block_type(ctx);
    	let if_block = current_block_type(ctx);

    	const block = {
    		c: function create() {
    			if_block.c();
    			if_block_anchor = empty();
    		},
    		m: function mount(target, anchor) {
    			if_block.m(target, anchor);
    			insert_dev(target, if_block_anchor, anchor);
    		},
    		p: function update(ctx, dirty) {
    			if_block.p(ctx, dirty);
    		},
    		d: function destroy(detaching) {
    			if_block.d(detaching);
    			if (detaching) detach_dev(if_block_anchor);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block.name,
    		type: "each",
    		source: "(22:2) {#each images as {t??tulo, autor, fecha, t??cnica, fuente, src, keyword, contexto, procedencia, descripci??n}}",
    		ctx
    	});

    	return block;
    }

    // (21:1) <Gallery>
    function create_default_slot(ctx) {
    	let each_1_anchor;
    	let each_value = images;
    	validate_each_argument(each_value);
    	let each_blocks = [];

    	for (let i = 0; i < each_value.length; i += 1) {
    		each_blocks[i] = create_each_block(get_each_context(ctx, each_value, i));
    	}

    	const block = {
    		c: function create() {
    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			each_1_anchor = empty();
    		},
    		m: function mount(target, anchor) {
    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].m(target, anchor);
    			}

    			insert_dev(target, each_1_anchor, anchor);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*images, selected*/ 1) {
    				each_value = images;
    				validate_each_argument(each_value);
    				let i;

    				for (i = 0; i < each_value.length; i += 1) {
    					const child_ctx = get_each_context(ctx, each_value, i);

    					if (each_blocks[i]) {
    						each_blocks[i].p(child_ctx, dirty);
    					} else {
    						each_blocks[i] = create_each_block(child_ctx);
    						each_blocks[i].c();
    						each_blocks[i].m(each_1_anchor.parentNode, each_1_anchor);
    					}
    				}

    				for (; i < each_blocks.length; i += 1) {
    					each_blocks[i].d(1);
    				}

    				each_blocks.length = each_value.length;
    			}
    		},
    		d: function destroy(detaching) {
    			destroy_each(each_blocks, detaching);
    			if (detaching) detach_dev(each_1_anchor);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_default_slot.name,
    		type: "slot",
    		source: "(21:1) <Gallery>",
    		ctx
    	});

    	return block;
    }

    function create_fragment(ctx) {
    	let main;
    	let div;
    	let h1;
    	let t1;
    	let gallery;
    	let current;

    	gallery = new Gallery({
    			props: {
    				$$slots: { default: [create_default_slot] },
    				$$scope: { ctx }
    			},
    			$$inline: true
    		});

    	const block = {
    		c: function create() {
    			main = element("main");
    			div = element("div");
    			h1 = element("h1");
    			h1.textContent = "Cat??logo de Imagenes de Cargueros";
    			t1 = space();
    			create_component(gallery.$$.fragment);
    			attr_dev(h1, "class", "svelte-18w1of7");
    			add_location(h1, file, 18, 2, 304);
    			attr_dev(div, "class", "main svelte-18w1of7");
    			add_location(div, file, 16, 1, 282);
    			attr_dev(main, "class", "svelte-18w1of7");
    			add_location(main, file, 15, 0, 274);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, main, anchor);
    			append_dev(main, div);
    			append_dev(div, h1);
    			append_dev(div, t1);
    			mount_component(gallery, div, null);
    			current = true;
    		},
    		p: function update(ctx, [dirty]) {
    			const gallery_changes = {};

    			if (dirty & /*$$scope*/ 16384) {
    				gallery_changes.$$scope = { dirty, ctx };
    			}

    			gallery.$set(gallery_changes);
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(gallery.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(gallery.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(main);
    			destroy_component(gallery);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('App', slots, []);
    	console.log(images);

    	for (let i = 0; i < images.length; i++) {
    		console.log(images[i].contexto);
    	}

    	const categories = ["todas"];
    	let selected = "todas";
    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console_1.warn(`<App> was created with unknown prop '${key}'`);
    	});

    	$$self.$capture_state = () => ({ images, Gallery, categories, selected });

    	$$self.$inject_state = $$props => {
    		if ('selected' in $$props) $$invalidate(0, selected = $$props.selected);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [selected];
    }

    class App extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance, create_fragment, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "App",
    			options,
    			id: create_fragment.name
    		});
    	}
    }

    const app = new App({
    	target: document.body,
    	props: {
    		name: 'world'
    	}
    });

    return app;

})();
//# sourceMappingURL=bundle.js.map
