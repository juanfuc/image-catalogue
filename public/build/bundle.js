
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
            título: "Indio yumbo",
            autor: "Vicente Albán",
            fecha: "1783",
            técnica: "Óleo sobre lienzo",
            dimensiones: "",
            fuente: "Museo de América, Madrid",
            descripción: "",
            periodo: "Colonial",
            contexto: ["Ilustración criolla", "Reformas borbonas", "Castas"],
            región: "Frontera amazónica",
            lugar: "Audiencia de Quito",
            src: "./imgs/1.png", 
            keyword: "",
            repositorio: "http://ceres.mcu.es/pages/Main?idt=77&inventary=00076&table=FMUS&museum=MAM",
            id: 0

        },
        {
            título: "Quadro de Historia Natural, Civil, y Geográfica del Reyno del Perú,",
            autor: "Luis Thiebaut. Comisionado por José Ignacio Lecuanda",
            fecha: "1799",
            técnica: "Óleo sobre lienzo",
            dimensiones: '331 x 118,5 cm',
            fuente: "Museo Nacional de Ciencias Naturales, Madrid",
            descripción: '',
            periodo: "colonial",
            contexto: ["Ilustración criolla", "Reformas borbonas","Castas"],
            región: "Frontera amazónica",
            lugar: "Virreinato del Peru",
            src:"./imgs/2.png", 
            keyword: "",
            repositorio: "https://artsandculture.google.com/asset/quadro-de-historia-natural-civil-y-geogr%C3%A1fica-del-reyno-del-per%C3%BA-jos%C3%A9-ignacio-de-lequanda/igE86USP5Q1cYg?hl=es",
            id: 1
        },
        {
            título: "Modos de cargar los indios a los que caminan por tierra de Quito a Napo",
            autor: "Anónimo. Expedición Malaspina",
            fecha: "1791",
            técnica: "Tinta y aguada, sobre papel",
            dimensiones: "17 x 11,5 cm",
            fuente: "Museo de América, Madrid",
            descripción: "",
            periodo: "Colonial",
            contexto: ["Expediciones científicas", "Reformas borbonas", "Castas", "Viajes"],
            región: "Frontera amazónica",
            lugar: "Virreinato del Peru",
            src:"./imgs/3.png", 
            keyword: "",
            repositorio: "http://ceres.mcu.es/pages/ResultSearch?Museo=MAM&txtSimpleSearch=Modo%20de%20cargar%20los%20indios%20a%20los%20que%20caminan&simpleSearch=0&hipertextSearch=1&search=simple&MuseumsSearch=MAM%7C&MuseumsRolSearch=11&listaMuseos=[Museo%20de%20Am%E9rica]",
            id: 2
        },
        {
            título: "Camino por las montañas de la provincia de Antioquia",
            autor: "Anónimo",
            fecha: "Probable 1800",
            técnica: "Dibujo en papel",
            dimensiones: "",
            fuente: "Archivo General de Indias, MP-ESTAMPAS,257",
            descripción: "",
            periodo: "Colonial",
            contexto: ["Reformas borbonas", "Viajes"],
            región: "Montañas andinas Nueva Granada",
            lugar: "Antioquia",
            src:"./imgs/4.png", 
            keyword: "",
            repositorio: "http://pares.mcu.es/ParesBusquedas20/catalogo/description/18613#",
            id: 3
        },
        {
            título: "Modo de entrar a la provincia de Antioquía, 1802",
            autor: "Anónimo",
            fecha: "1802",
            técnica: "Dibujo en papel",
            dimensiones: "",
            fuente: "Archivo General de Indias, MP-ESTAMPAS,257Bis",
            descripción: "",
            periodo: "Colonial",
            contexto: ["Reformas borbonas", "Viajes"],
            región: "Montañas andinas Nueva Granada",
            lugar: "Antioquia",
            src:"./imgs/5.png", 
            keyword: "",
            repositorio: "http://pares.mcu.es/ParesBusquedas20/catalogo/description/18613#",
            id: 4
        },
        {
            título: "Passage du Quindiu dans le Cordillère des Andes", 
            autor: "Alexander von Humboldt. Christian Friedrich Duttenhofer (Grab.). Joseph Anton Koch (Dibj.)",
            fecha: "1810",
            técnica: "Grabado",
            dimensiones: "",
            fuente: "Vues des Cordillères, et Monuments des Peuples indigènes de l’Amérique, (París: Schoell, 1810)",
            descripción: "",
            periodo: "Colonial",
            contexto: ["Expediciones científicas", "Viajes", "Humboldt", "Paisajes"],
            región: "Montañas andinas Nueva Granada",
            lugar: "Camino del Quindio",
            src:"./imgs/6.png", 
            keyword: "",
            Repositorio: "",
            id: 5

        },
        {
            título: "Passage du Quindiu dans le Cordillère des Andes. (Detalle)", 
            autor: "Alexander von Humboldt. Christian Friedrich Duttenhofer (Grab.). Joseph Anton Koch (Dibj.)",
            fecha: "1810",
            técnica: "Grabado",
            dimensiones: "",
            fuente: "Vues des Cordillères, et Monuments des Peuples indigènes de l’Amérique, (París: Schoell, 1810)",
            descripción: "",
            periodo: "Colonial",
            contexto: ["Expediciones científicas", "Viajes", "Humboldt", "Paisajes"],
            región: "Montañas andinas Nueva Granada",
            lugar: "Camino del Quindio",
            src:"./imgs/7.png", 
            keyword: "",
            Repositorio: "",
            id: 6
        },
        {
            título: "Campamento camino del Quindio", 
            autor: "Francois Desire Roulin",
            fecha: "1824-1825",
            técnica: "Boceto a tinta",
            dimensiones: "",
            fuente: "Marguerite Combes, Pauvre et aventureuse. Bourgeoisie. Roulin et ses amis (1796-1874), (Paris: Peyronnet, 1929)",
            descripción: "",
            periodo: "Primera mitad siglo XIX",
            contexto:["Expediciones científicas", "Viajes", "Tipos"],
            región: "Montañas andinas Nueva Granada",
            lugar: "Camino del Quindio",
            src: "./imgs/8.png", 
            keyword: "roulin",
            repositorio: "",
            id: 7
        }, 
        {
            título: "Peoner i andisca bergen", 
            autor: "August Gosselman. C. G. Plagemann[Dib.]. Gjothstrom Magnusson[Grab.]",
            fecha: "1827",
            técnica: "litografía",
            dimensiones: "15.2 × 10.3 cm",
            fuente: "Karl August Gosselman, Resa i Colombia, åren 1825 och 1826 (Estocolmo: Tryckt hos Joahn Horberg, 1827)",
            descripción: "",
            periodo: "Primera mitad siglo XIX",
            contexto: ["Viajes", "Comercio", "Tipos"],
            región: "Montañas andinas Nueva Granada",
            lugar: "Antioquia",
            src:"./imgs/9.jpg",
            keyword: "gosselman",
            repositorio: "",
            id: 8
        },
        {
            título: "Precipitous descent of a cordillera of the Andes in the province of Chocó", 
            autor: "Charles Stuart Cochrane [Atribuido]",
            fecha: "1825",
            técnica: "Grabado", 
            fuente: "Charles Stuart Cochrane, Journal of a Residence and Travels in Colombia, During the Years 1823 and 1824 (In Two volumes), (Londres: Henry Colburn, 1825)",
            descripción: "",
            periodo: "Primera mitad siglo XIX",
            contexto: ["Viajes", "Comercio", "Tipos"],
            región: "Montañas andinas Nueva Granada",
            lugar: "Camino a Nóvita, Chocó",
            src:"./imgs/10.png",
            keyword: "cochrane",
            repositorio: "https://archive.org/details/journalaresiden00unkngoog/page/n8/mode/2up",
            id: 9
        },
        {
            título: "View of the pass from Quindio. In the province of Popayan & cargueros (or carriers) who travel it", 
            autor: "John Potter Hamilton [Atribuido]. Eduard Francis Finden [grab]",
            fecha: "1827",
            técnica: "Grabado",
            dimensiones: "",
            fuente: "John Potter Hamilton, Travels through the interior provinces of Columbia (Londres: John Murray, 1827)",
            descripción: "",
            periodo: "Primera mitad siglo XIX",
            contexto: ["Viajes", "Diplomacia", "Roulin", "Tipos"],
            región: "Montañas andinas Nueva Granada",
            lugar: "Camino del Quindio",
            src:"./imgs/11.png",
            keyword: "roulin",
            repositorio: "",
            id: 10
        },
        {
            título: "s/n", 
            autor: "Anonimo",
            fecha: "s/f",
            técnica: "Grabado",
            dimensiones: "",
            fuente: "Museo Nacional de Colombia",
            descripción: "",
            periodo: "Primera mitad siglo XIX",
            contexto: ["Viajes", "Roulin", "Tipos"],
            región: "Montañas andinas Nueva Granada",
            lugar: "s/i",
            src:"./imgs/12.png",
            keyword: "roulin",
            repositorio: "",
            id: 11
        },
        {
            título: "s/n", 
            autor: "Auguste Le Moyne [Atribuido]",
            fecha: "1828",
            técnica: "Acuarela sobre papel vejurrado de fabricación industrial",
            dimensiones: "22 x 18cm",
            fuente: "Beatriz González, Donación Carlos Botero-Nora Restrepo: Auguste Le Moyne en Colombia 1828-1841, (Bogotá: Museo Nacional de Colombia, 2004)",
            descripción: "",
            periodo: "Primera mitad siglo XIX",
            contexto: ["Viajes", "Diplomacia", "Roulin", "Groot", "Tipos"],
            región: "Montañas andinas Nueva Granada",
            lugar: "s/i",
            src:"./imgs/13.png",
            keyword: "gosselman",
            id: 12
        },
        {
            título: "The artist carried in a sillero over the Chiapas from Palenque to Ocosingo, Mexico", 
            autor: "Baron Jean–Frédérik Waldeck",
            fecha: "1833",
            técnica: "Óleo sobre Lienzo",
            dimensiones: "49.3 × 41.5 cm.",
            fuente: "Princeton University Art Museum",
            descripción: "",
            periodo: "Primera mitad siglo XIX",
            contexto: ["Viajes", "Expediciones científicas", "México", "Tipos"],
            región: "Montañas de Mesoamerica",
            lugar: "Chiapas. Camino a Palenque",
            src:"./imgs/14.png",
            keyword: "",
            id: 13
        },
        {
            título: "Viajero llevado sobre la espalda del indio en las montañas de la provincia de Antioquia", 
            autor: "Auguste Le Moyne [Atribuido]",
            fecha: "1835",
            técnica: "Acuarela sobre papel vejurrado de fabricación industrial",
            dimensiones: "26.3 x 17.8cm",
            fuente: "Beatriz González, Donación Carlos Botero-Nora Restrepo: Auguste Le Moyne en Colombia 1828-1841, (Bogotá: Museo Nacional de Colombia, 2004)",
            descripción: "Tiene la misma pose de las manos cruzadas del carguero de Gosselman. La composici'on se asemeja al boceto sin título de la coleccion de Joseph Brown",
            periodo: "Primera mitad siglo XIX",
            contexto: ["Viajes", " Diplomacia", "Roulin", "Groot", "Gosselman", "Tipos"],
            región: "Montañas andinas Nueva Granada",
            lugar: "Antioquia",
            src:"./imgs/15.png",
            keyword: "gosselman",
            repositorio: "",
            id: 14
        },
        {
            título: "[Carguero]", 
            autor: "Joseph Brown [Atribuido]",
            fecha: "1826-1840",
            técnica: "Boceto a tinta",
            dimensiones: " 33.6 x 24 cm",
            fuente: "Colección de pinturas de Joseph Brown. Royal geographical society of London",
            descripción: "Tiene la misma pose con las manos cruzadas del carguero de Gosselman. La composicion se asemeja al boceto sin título de la coleccion de August Le Moyne",
            periodo: "Primera mitad siglo XIX",
            contexto: ["Viajes", "Diplomacia", "Groot", "Gosselman", "Tipos"],
            región: "Montañas andinas Nueva Granada",
            lugar: "s/i",
            src:"./imgs/16.png",
            keyword: "gosselman",
            id: 15
        },
        {
            título: "Men Carriers", 
            autor: "Saturday Magazine",
            fecha: "1839",
            técnica: "Boceto a tinta",
            dimensiones: "",
            fuente: "Glances at the Modes of Traveling in Foreign Lands, The Saturday Magazine 449 (1839): 250-256",
            descripción: "En Inglaterra, en 1839, apareció una alusión a la metáfora que comparaba al carguero con un animal de carga -en referencia a la anécdota de Humboldt- en un artículo de The Saturday Magazine donde se discutía sobre los tipos de carruajes usados en diversos lugares del mundo y la fuerza motriz que los movía. Allí, el horizonte de expectativa se proyecta hacia un escenario en el que estas fuerzas podrán ser de otra naturaleza y reemplazar las de los animales y los hombres. El Saturday Magazine era la revista que competía con The Penny Magazine. Estas revistas fueron pioneras en el uso de un modelo de impresión que El modelo consistía en un formato de publicación, unas aplicaciones tecnológicas del uso de la xilografía y el prototipado, un proceso de racionalización de la producción de impresos, un modelo de negocio y un ideal acerca de la correlación que hay entre la expansión del mercado de lectores y la posibilidad de llevar el acceso al conocimiento 'útil' hasta las clases populares. Ver 'The Commercial History of a Penny Magazine', The Penny Magazine 1 (1833): 377 (suplemento). ",
            periodo: "Primera mitad siglo XIX",
            contexto: ["Viajes","Prensa", "Humboldt", "Tipos"],
            región: "Montañas andinas Nueva Granada",
            lugar: "Camino del Quindio",
            src:"./imgs/17.png",
            keyword: "Humboldt",
            repositorio: "",
            id: 16
        },
        {
            título: "Costumes / Colombie", 
            autor: "Anonimo",
            fecha: "1837",
            técnica: "Aguafuerte coloreado sobre papel",
            dimensiones: "",
            fuente: "L'Univers. Histoire et Description de tous les Peuples. Bresil par Ferdinand Denis & Colombie et Guyanes par Cesar Famin (Paris: Firmin Didot Frères Éditeurs, 1837)",
            descripción: "Las láminas que sirvieron de modelo a la composición fueron identificadas por Beatriz González y Carolina Vanegas, 2017. Esta última afirma que la figura del carguero está basada en la lámina de Hamilton",
            periodo: "Primera mitad siglo XIX",
            contexto: ["Viajes", "Roulin", "Tipos"],
            región: "Montañas andinas Nueva Granada",
            lugar: "Camino del Quindio",
            src:"./imgs/18.png", 
            keyword: "roulin",
            repositorio: "",
            id: 17
        },
        {
            título: "Le passage du Quindiu entre Ibague y Cartago", 
            autor: "Alcide d'Orbigny. Original de Francois Desire Roulin",
            fecha: "1836",
            técnica: "Grabado",
            dimensiones: "",
            fuente: "Alcide D’Orbigny, Voyage pittoresque dans les deux Amériques (Chez L. Tenré, Libraire-éditeur)",
            descripción: "",
            periodo: "Primera mitad siglo XIX",
            contexto: ["Viajes", "Expediciones científicas", "Roulin", "Tipos"],
            procedencia: "Francia",
            región: "Montañas andinas Nueva Granada",
            lugar: "Camino del Quindio",
            src:"./imgs/19.png",
            keyword: "roulin",
            repositorio: "",
            id: 18
        },
        {
            título: "El Tabillo: Maniére dont les voyageurs sont portés á dos d’homme dans les envirous de Pasto ", 
            autor: "A de Lattre. Original de Francois Desire Roulin",
            fecha: "1848",
            técnica: "Grabado",
            dimensiones: "",
            fuente: "Le Magasin pittoresque, 16, 1848",
            descripción: "Descripción del carguero en el Putumayo. Llama la atención que la técnica usada es diferente, la silla es más rudimentaria, y el pasajero mira hacia delante. Notar relación con la acuarela de Gutiérrez de Alba que refiere a un carguero en Caquetá, y con la del carguero de Ecuador de la expedición Malaspina. Parece ser una característica propia de los ejemplares del sur",
            periodo: "Mediados del siglo XIX",
            contexto: ["Viajes","Prensa", "Tipos"],
            procedencia: "Francia",
            región: "Frontera amazónica",
            lugar: "Putumayo",
            src:"./imgs/20.png",
            keyword: "",
            repositorio: "",
            id: 19
        },
        {
            título: "Passage d’un torrent", 
            autor: "A de Lattre. Original de Francois Desire Roulin",
            fecha: "1848",
            técnica: "Grabado",
            dimensiones: "",
            fuente: "Le Magasin pittoresque, 16, 1848",
            descripción: "",
            periodo: "Mediados del siglo XIX",
            contexto: ["Prensa", "Viajes", "Tipos"],
            procedencia: "Francia",
            región: "Frontera amazónica",
            lugar: "Putumayo",
            src:"./imgs/21.png",
            keyword: "",
            repositorio: "",
            id: 20
        },
        {
            título: "La silla: maniére de porter les voyageurs dans le Quindiu", 
            autor: "A de Lattre. Original de Francois Desire Roulin",
            fecha: "1848",
            técnica: "Grabado",
            dimensiones: "",
            fuente: "Le Magasin pittoresque, 16, 1848",
            descripción: "Tomada del modelo de Roulin. Se usa para contrastar con el método de las tierras del sur, llamado Tablillo",
            periodo: "Mediados del siglo XIX",
            contexto: ["Prensa", "Viajes", "Tipos", "Roulin"],
            procedencia: "Francia",
            región: "Montañas andinas Nueva Granada",
            lugar: "Camino del Quindío",
            src:"./imgs/22.png",
            keyword: "roulin",
            repositorio: "",
            id: 21
        },
        {
            título: "La silla: maniére de porter les voyageurs dans le Quindiu (Detalle)", 
            autor: "A de Lattre. Original de Francois Desire Roulin",
            fecha: "1848",
            técnica: "Grabado",
            dimensiones: "",
            fuente: "Le Magasin pittoresque, 16, 1848",
            descripción: "",
            periodo: "Mediados del siglo XIX",
            contexto: ["Prensa", "Viajes", "Tipos", "Roulin"],
            procedencia: "Francia",
            región: "Montañas andinas Nueva Granada",
            lugar: "Camino del Quindío",
            src:"./imgs/23.png",
            keyword: "roulin",
            repositorio: "",
            id: 22
        },
        {
            título: "La silla: maniére de porter les voyageurs dans le Quindiu (Página completa)", 
            autor: "A de Lattre. Original de Francois Desire Roulin",
            fecha: "1848",
            técnica: "Grabado",
            dimensiones: "",
            fuente: "Le Magasin pittoresque, 16, 1848",
            descripción: "",
            periodo: "Mediados del siglo XIX",
            contexto: ["Prensa", "Viajes", "Tipos", "Roulin"],
            procedencia: "Francia",
            región: "Montañas andinas Nueva Granada",
            lugar: "Camino del Quindío",
            src:"./imgs/24.png",
            keyword: "roulin",
            repositorio: "",
            id: 23
        },
        {
            título: "s/t", 
            autor: "Cordech (Atribuido)",
            fecha: "1849",
            técnica: "Grabado",
            dimensiones: "",
            fuente: "Semanario Pintoresco Español 12 (1849): 91",
            descripción: "En 1849 apareció la misma imagen del artículo de Magasin Pittoresque de A de Lattre, aunque atribuyéndole el crédito a otro dibujante y sin atribuciones al grabado, en una versión española de la revista francesa denominada el Semanario Pintoresco Español atribuido a 'un viajero'",
            periodo: "Mediados del siglo XIX",
            contexto: ["Prensa", "Viajes", "Tipos", "Roulin"],
            procedencia: "España",
            región: "Montañas andinas Nueva Granada",
            lugar: "Camino del Quindío",
            src:"./imgs/25.png",
            keyword: "roulin",
            repositorio: "",
            id: 24
        },
        {
            título: "Die Silla", 
            autor: "AHC. Rose",
            fecha: "1851",
            técnica: "Grabado",
            dimensiones: "",
            fuente: "Das Pfennig-Magazin 19 (1851)",
            descripción: "Otro ejemplar de la imagen del artículo de A de Lattre en Magasin Pittoresque puede encontrarse, con las mismas atribuciones al dibujante y al grabador, en la revista alemana Das Pfennig-Magazin, publicada en 1851. De acuerdo con un modelo de producción de impresos y de distribución y comercialización popularizado por The Penny Magazine -la directa competidora de The Saturday Magazine-, era habitual que entre estas revistas se compraran entre ellas los artículos y las planchas xilográficas para producir las imágenes y de esta manera llenar el contenido de las propias publicaciones. Estas revistas estaban orientadas a un público amplio y tenían un ánimo de instrucción y educación popular.",
            periodo: "Mediados del siglo XIX",
            contexto: ["Prensa", "Viajes", "Tipos", "Roulin"],
            procedencia: "Alemania",
            región: "Montañas andinas Nueva Granada",
            lugar: "Camino del Quindío",
            src:"./imgs/26.png",
            keyword: "roulin",
            repositorio: "",
            id: 25
        },
        {
            título: "Die Silla", 
            autor: "AHC. Rose",
            fecha: "1851",
            técnica: "Grabado",
            dimensiones: "",
            fuente: "Das Pfennig-Magazin 19 (1851)",
            descripción: "Otro ejemplar de la imagen del artículo de A de Lattre en Magasin Pittoresque puede encontrarse, con las mismas atribuciones al dibujante y al grabador, en la revista alemana Das Pfennig-Magazin, publicada en 1851. De acuerdo con un modelo de producción de impresos y de distribución y comercialización popularizado por The Penny Magazine -la directa competidora de The Saturday Magazine-, era habitual que entre estas revistas se compraran entre ellas los artículos y las planchas xilográficas para producir las imágenes y de esta manera llenar el contenido de las propias publicaciones. Estas revistas estaban orientadas a un público amplio y tenían un ánimo de instrucción y educación popular.",
            periodo: "Mediados del siglo XIX",
            contexto: ["Prensa", "Viajes", "Tipos", "Roulin"],
            procedencia: "Alemania",
            región: "Montañas andinas Nueva Granada",
            lugar: "Camino del Quindío",
            src:"./imgs/27.png",
            keyword: "roulin",
            repositorio: "",
            id: 26
        },
        {
            título: "Cargueros", 
            autor: "s/a",
            fecha: "1846",
            técnica: "Grabado",
            dimensiones: "",
            fuente: "Humbolt's travels and discoveries in South America, (Londres: John W. Parker, 1846)",
            descripción: "Esta edición no tienen un autor identificado y relata los viajes de Humboldt en tercera persona. Otmar Ette ha mostrado cómo muchos editores se aprovecharon de la fama del viaje de Humboldt y las expectativas del público de informarse de estos sin tener que esforzarse demasiado en asuntos técnicos. La obra parece seguir el itinerario de Relation historique. El resto del viaje es recosnrtruido con fragmentos de Vues y se despachan en un solo capítulo. La mayoría de las imágenes son copias de mala calidad de Vues. Algunas otras no son de las obras de Humboldt. El carguero aparece en la primera página debajo del título y en la página 253. Es tomado de la quinta lámina de Vues, pero no aparece en su totalidad, sino apenas un primer plano. Por su parte, el carguero que en la lámina de Humboldt no está cargando a nadie, en este caso si lleva carga. Es la misma imagen usada en el artículo de 1839 en The Saturday Magazine. Ambos productos fueron publicados por la misma editorial. Probablemente usaron la misma plancha para hacer el grabado",
            periodo: "Mediados del siglo XIX",
            contexto: ["Prensa", "Viajes", "Tipos", "Humboldt"],
            procedencia: "Alemania",
            región: "Montañas andinas Nueva Granada",
            lugar: "Camino del Quindío",
            src:"./imgs/28.png",
            keyword: "Humboldt",
            repositorio: "",
            id: 27
        },
        {
            título: "Camino a Nóvita en la montaña de Tamaná", 
            autor: "Anonimo (erroneamente atribuida a Manuel Maria Paz)",
            fecha: "1853",
            técnica: "Acuarela sobre papel",
            dimensiones: "",
            fuente: "Coleccion Acuarelas de la Comision Corografica. Biblioteca Nacional de Colombia, Bogotá.",
            descripción: "La lámina plantea un evidente contraste entre el estatus civilizado, subrayado por el libro abierto, la postura y el atuendo del viajero, y “lo bárbaro del carguero y su entorno” (Appelbaum 2017, 95). Es una ilustración de un pasaje relatado en los viajez de Santiago Pérez, por aquel entonces relator de la Comisión corográfica, publicados en El Neogranadino. La imagen fue compuesta por un autor anónimo -probablemente León Ambrose Gauthier- a partir de un boceto de Manuel María Paz y del relato de Santiago Pérez",
            periodo: "Mediados del siglo XIX",
            contexto: ["Expediciones científicas", "Tipos"],
            procedencia: "Colombia",
            región: "Montañas andinas Nueva Granada",
            lugar: "Camino a Nóvita, Chocó",
            src:"./imgs/29.png", 
            keyword: "",
            repositorio: "",
            id: 28
        },
        {
            título: "Manisales, provincia de Córdova", 
            autor: "Henry Price",
            fecha: "1852",
            técnica: "Acuarela sobre papel",
            dimensiones: "",
            fuente: "Coleccion Acuarelas de la Comision Corografica. Biblioteca Nacional de Colombia, Bogotá.",
            descripción: "El carguero de esta acuarela, al contrario del de la imagen Camino a Nóvita Barbacoas, tiene piel clara y barba, y lleva en sus espaldas a alguien que puede ser considerado su par. Para Appelbaum, la diferencia entre las dos láminas de los cargueros sintetiza la percepción tan distinta que la Comisión tenía de las “tierras bajas” de la costa pacífica con respecto a las “tierras altas” de las provincias andinas. Los habitantes de las tierras altas andinas, “algo toscos, pero en general laboriosos, estaban a la espera de mejores instituciones republicanas” (2017, 97). Por el contrario, los habitantes de la costa pacífica fueron rotulados de “negros” y eran considerados bárbaros que no merecían instituciones democráticas sino la aplicación de medidas coercitivas (Appelbaum 2017, 98).",
            periodo: "Mediados del siglo XIX",
            contexto: ["Viajes","Expediciones científicas", "Tipos"],
            procedencia: "Colombia",
            región: "Montañas andinas Nueva Granada",
            lugar: "Antioquia",
            src:"./imgs/30.png", 
            keyword: "",
            repositorio: "",
            id: 29
        },
        {
            título: "Antiguo modo de viajar por la montaña del Quindío", 
            autor: "Ramón Torres Méndez",
            fecha: "1851",
            técnica: "Grabado",
            dimensiones: "",
            fuente: "El Pasatiempo [Bogotá] dic. 20, 1851.",
            descripción: "El Pasatiempo, El Neogranadino y la colección de láminas Costumbres neogranadinas son proyectos editoriales que están relacionados con un mismo taller de imprenta (promovido por Manuel Ancízar). Este se caracterizó por una transformación de la concepción sobre la  periódica que contempla la necesidad de expandir la conformación de un público mediante innovaciones tecnológicas, procesos de racionalización de la producción y estrategias de difusión. Siguieron los pasos de Émile de Girardin, un periodista francés que había seguido el ejemplo del Magasin Pittoresque de Édouard Charton. En octubre de 1851, por ejemplo, se anunció la publicación de una serie de láminas iluminadas” que pretendían promocionar suscripciones a los periódicos de la imprenta.  A partir del 8 de noviembre de 1851, aparecieron cada semana en el periódico descripciones detalladas de las láminas, acompañadas de xilografías que representaban detalles de las originales",
            periodo: "Mediados del siglo XIX",
            contexto: ["Viajes", "Prensa", "Tipos"],
            procedencia: "Colombia",
            región: "Montañas andinas Nueva Granada",
            lugar: "Camino del Quindío",
            src:"./imgs/31.png", 
            keyword: "",
            Repositorio: "",
            id: 30
        },
        {
            título: "Antiguo modo de viajar por la montaña del Quindío", 
            autor: "Ramón Torres Méndez",
            fecha: "1851",
            técnica: "litografía iluminada",
            dimensiones: "",
            fuente: "Colección  de  arte  del  Banco  de  la  República,  Bogotá.  La  litografía  pertenece  al  álbum  Costumbres neogranadinas, impreso en la litografía de Martínez y hermanos",
            descripción: "El Pasatiempo, El Neogranadino y la colección de láminas Costumbres neogranadinas son proyectos editoriales que están relacionados con un mismo taller de imprenta (promovido por Manuel Ancízar). Este se caracterizó por una transformación de la concepción sobre la  periódica que contempla la necesidad de expandir la conformación de un público mediante innovaciones tecnológicas, procesos de racionalización de la producción y estrategias de difusión. Siguieron los pasos de Émile de Girardin, un periodista francés que había seguido el ejemplo del Magasin Pittoresque de Édouard Charton. En octubre de 1851, por ejemplo, se anunció la publicación de una serie de láminas iluminadas” que pretendían promocionar suscripciones a los periódicos de la imprenta.  A partir del 8 de noviembre de 1851, aparecieron cada semana en el periódico descripciones detalladas de las láminas, acompañadas de xilografías que representaban detalles de las originales",
            periodo: "Mediados del siglo XIX",
            contexto: ["Arte", "Viajes", "Prensa", "Tipos", "Costumbres"],
            procedencia: "Colombia",
            región: "Montañas andinas Nueva Granada",
            lugar: "Camino del Quindío",
            src:"./imgs/32.png", 
            keyword: "",
            Repositorio: "",
            id: 31
        },
        {
            título: "Silleros in the Quindío", 
            autor: "Isaac F. Holton",
            fecha: "1857",
            técnica: "Grabado",
            dimensiones: "",
            fuente: "New Granada: Twenty Months in the Andes, (Nueva York: Harper and Brothers Publishers, 1857) 364",
            descripción: "Holton tomó todas las imágenes de las láminas de las costumbres neogranadinas de Ramón Torres Méndez. No cita al autor neogranadino y se refiere a las situaciones de las imágenes como si estas representasen anécdotas personales. Esta en particular es tomada de la lámina Modo de viajar en las montañas de Quindío y Sonsón",
            periodo: "Segunda mitad del siglo XIX",
            contexto: ["Viajes", "Tipos", "Torres Méndez"],
            procedencia: "Estados Unidos",
            región: "Montañas andinas Nueva Granada",
            lugar: "Camino del Quindío",
            src:"./imgs/33.png", 
            keyword: "",
            repositorio: "",
            id: 32
        },
        {
            título: "Ridding in a Silla", 
            autor: "Frederick Catherwood",
            fecha: "1857",
            técnica: "Grabado",
            dimensiones: "",
            fuente: "John Lloyd Stephens, Incidents of travel in Central America, Chiapas and Yucatan, (Londres: Arthur Hall, Virtue y Co, 1857)",
            descripción: "",
            periodo: "Segunda mitad siglo XIX",
            contexto: ["Viajes", "Expediciones científicas", "Tipos", "México"],
            región: "Montañas de Mesoamerica",
            lugar: "Chiapas. Camino a Palenque",
            src:"./imgs/34.png",
            keyword: "",
            repositorio: "",
            id: 33
        },
        {
            título: "Peón carguero de las tierras altas", 
            autor: "Ramón Torres Méndez",
            fecha: "1851",
            técnica: "litografía iluminada",
            dimensiones: "",
            fuente: "Colección de arte del Banco de la República, Bogotá",
            descripción: "",
            periodo: "Mediados del siglo XIX",
            contexto: ["Arte", "Viajes", "Prensa", "Tipos", "Costumbres"],
            procedencia: "Colombia",
            región: "Montañas andinas Nueva Granada",
            lugar: "", 
            src:"./imgs/35.png", 
            keyword: "",
            repositorio: "",
            id: 34
        },
        {
            título: "Porteur de Quindió", 
            autor: " Charles Saffray. A. de Neuville (Dibj.)",
            fecha: "1873",
            técnica: "Grabado",
            dimensiones: "",
            fuente: "Le Tour du Monde 26 (1873)",
            descripción: "La pose con el pie derecho hacia delante recuerda la pose del 'Peón carguero de las tierras altas' de Torres Méndez.",
            periodo: "Segunda mitad siglo XIX",
            contexto: ["Viajes", "Prensa", "Tipos", "Torres Méndez"],
            procedencia: "Francia",
            región: "Montañas andinas Nueva Granada",
            lugar: "Camino del Quindío", 
            src:"./imgs/36.png", 
            keyword: "",
            repositorio: "https://gallica.bnf.fr/ark:/12148/bpt6k104971v/f79.item",
            id: 35
        },
        {
            título: "La montagne de Quindió", 
            autor: "Charles Saffray. A. de Neuville (Dibj.)",
            fecha: "1826-1840",
            técnica: "Grabado. 15,6 x 11,7 cm, blanco y negro",
            dimensiones: "",
            fuente: "Charles Saffray, Voyage à la Nouvelle Grenade. Le Tour de monde, 26, 1973",
            descripción: "La disposición recuerda al la lḿina de carguero de Cochrane",
            periodo: "Segunda mitad siglo XIX",
            contexto: ["Viajes", "Prensa", "Tipos", "Cochrane"],
            procedencia: "Francia",
            región: "Montañas andinas Nueva Granada",
            lugar: "Camino del Quindío", 
            src:"./imgs/37.png", 
            keyword: "cochrane",
            repositorio: "https://gallica.bnf.fr/ark:/12148/bpt6k104971v/f80.item",
            id: 36 
        },
        {
            título: "Carguero de la montaña de Sonsón", 
            autor: "Ramón Torres Méndez",
            fecha: "1878",
            técnica: "litografía iluminada",
            dimensiones: "",
            fuente: "Scènes de la vie Colombiène, (Paris: Imprenta A Delarue, 1878)",
            descripción: "",
            periodo: "Segunda mitad siglo XIX",
            contexto: ["Arte", "Viajes", "Tipos", "Costumbres"],
            procedencia: "Francia",
            región: "Montañas andinas Nueva Granada",
            lugar: "Antioquia", 
            src:"./imgs/38.png", 
            keyword: "",
            repositorio: "",
            id: 37
        },
        {
            título: "Mi escribiente pasando una quebrada a espaldas de su peón carguero", 
            autor: "José María Gutiérrez de Alba",
            fecha: "1873",
            técnica: "Acuarela sobre papel gris",
            dimensiones: "18 x 15 cm",
            fuente: "	Tomo IX. Excursión al Caquetá. Del 28 de enero al 26 de mayo de 1873. Impresiones de un viaje en América (1970-1884)",
            descripción: "",
            periodo: "Segunda mitad siglo XIX",
            contexto: ["Viajes", "Diplomacia", "Tipos"],
            procedencia: "España",
            región: "Montañas andinas Nueva Granada",
            lugar: "Caquetá", 
            src:"./imgs/39.png", 
            keyword: "",
            repositorio: "https://www.banrepcultural.org/impresiones-de-un-viaje/index.php?r=laminas%2Fview&id=216&&&",
            id: 38
        },
        {
            título: "Camino y puente en la montaña de Tamaná (Chocó). Puentes curiosos de Colombia N° 3", 
            autor: "José María Gutiérrez de Alba",
            fecha: "1875",
            técnica: "Acuarela sobre papel gris",
            dimensiones: "21 x 16 cm",
            fuente: "Tomo XII. Apéndice. Maravillas y curiosidades de Colombia. Impresiones de un viaje en América (1970-1884)",
            descripción: "",
            periodo: "Segunda mitad siglo XIX",
            contexto: ["Viajes", "Diplomacia", "Tipos"],
            procedencia: "España",
            región: "Montañas andinas Nueva Granada",
            lugar: "Camino a Nóvita, Chocó", 
            src:"./imgs/40.png", 
            keyword: "",
            repositorio: "https://babel.banrepcultural.org/digital/collection/p17054coll16/id/359",
            id: 39
        },
        {
            título: "Peón carguero de las tierras frías conduciendo una viajera por el páramo. Tipos colombianos N° 12", 
            autor: "José María Gutiérrez de Alba",
            fecha: "1873",
            técnica: "Litografía iluminada a la acuarela",
            dimensiones: "	18 x 13 cm",
            fuente: "Tomo XII. Apéndice. Maravillas y curiosidades de Colombia. Impresiones de un viaje en América (1970-1884)",
            descripción: "",
            periodo: "Segunda mitad siglo XIX",
            contexto: ["Viajes", "Diplomacia", "Tipos", "Torres Méndez"],
            procedencia: "España",
            región: "Montañas andinas Nueva Granada",
            lugar: "Tierras altas", 
            src:"./imgs/41.png", 
            keyword: "",
            repositorio: "https://babel.banrepcultural.org/digital/collection/p17054coll16/id/359",
            id: 40
        },
        {
            título: "Carguero du Quindio et sa silleta", 
            autor: "Edouard André",
            fecha: "1879",
            técnica: "Grabado",
            dimensiones: "",
            fuente: "Tour du Monde, Nouveau Journal des Voyages 37, 1879",
            descripción: "",
            periodo: "Segunda mitad siglo XIX",
            contexto: ["Viajes", "Prensa", "Tipos"],
            procedencia: "Francia",
            región: "Montañas andinas Nueva Granada",
            lugar: "Camino del Quindío", 
            src:"./imgs/42.png",
            keyword: "", 
            repositorio: "https://gallica.bnf.fr/ark:/12148/bpt6k34410z/f114.item",
            id: 41
        },
        {
            título: "La montée de l'Agonie",
            autor: "Edouard André. Maillart(dibj.)",
            fecha: "1879",
            técnica: "Grabado",
            dimensiones: "",
            fuente: "Tour du Monde, Nouveau Journal des Voyages 38, 1879",
            descripción: "",
            periodo: "Segunda mitad siglo XIX",
            contexto: ["Viajes", "Prensa", "Tipos"],
            procedencia: "Francia",
            región: "Frontera amazónica",
            lugar: "Putumayo",
            src:"./imgs/43.png", 
            keyword: "",
            repositorio: "https://gallica.bnf.fr/ark:/12148/bpt6k344119/f366.item",
            id: 42
        },    
        {
            título: "Voyage a dos d’indie",
            autor: "C. P. Étienne",
            fecha: "1887",
            técnica: "Grabado",
            dimensiones: "",
            fuente: "Aperçu General sur la Colombie et recits de voyages en Amérique, (Geneve: Impr. M. Richter, 1887)",
            descripción: "",
            periodo: "Segunda mitad del siglo XIX",
            contexto: ["Viajes", "Tipos"],
            procedencia: "Suiza",
            región: "Montañas andinas Nueva Granada",
            lugar: "Camino del Quindío",
            src:"./imgs/44.png", 
            keyword: "roulin",
            repositorio: "",
            id: 43
        },
        {
            título: "The reconstruction policy of Congress, as illustrated in California",
            autor: "s/a",
            fecha: "1867.",
            técnica: "Litografia en papel tejido",
            dimensiones: "36.8 x 27.2 cm",
            fuente: "Library of Congress Prints and Photographs Division Washington, D.C. 20540 USA http://hdl.loc.gov/loc.pnp/p.print",
            descripción: "Una sátira dirigida a la adhesión del candidato republicano a gobernador de California, George C. Gorham, a los derechos de voto de los negros y otras minorías. El hermano Jonathan (izquierda) advierte a Gorham: '¡Joven! Lee la historia de tu país y aprende que esta urna electoral se dedicó únicamente a la raza blanca. La carga que llevas te hundirá en la perdición, a donde perteneces, o a mi nombre no es Jonathan'. Sostiene su mano protectoramente sobre una urna de vidrio, que se encuentra en un pedestal frente a él. En el centro está Gorham, cuyos hombros sostienen, uno encima del otro, a un hombre negro, un hombre chino y un guerrero indio.",
            periodo: "Segunda mitad siglo XIX",
            contexto: ["Caricatura", "Crítica social", "Sátira"],
            procedencia: "Estados Unidos",
            región: "California",
            lugar: "California",
            src:"./imgs/45.png", 
            keyword: "",
            repositorio: "https://www.loc.gov/pictures/resource/ds.14037/",
            id: 44
        },
        {
            título: "[Hamal] ou portefaix",
            autor: "Anónimo",
            fecha: "Finales siglo XVIII",
            técnica: "Acuarela",
            dimensiones: "",
            fuente: "Recueil. Dessins originaux de costumes turcs : un recueil de dessins aquarelles. Paris, Bibliothèque nationale de France, Estampes et photographie, 4-OD-23",
            descripción: "",
            periodo: "Finales del siglo XVIII",
            contexto: ["Viajes", "Trajes", "Cargadores globales"],
            procedencia: "Francia",
            región: "Imperio Otomano",
            lugar: "Turquía",
            src:"./imgs/46.png", 
            keyword: "",
            repositorio: "https://gallica.bnf.fr/ark:/12148/btv1b8455918s/f72.item",
            id: 45
        },
        {
            título: "F. 17. Chaise à Porteur ordinaire pour ceux qui n' ont acun rang. Rues de Pékin",
            autor: "Henri Léonard Jean-Baptiste Bertin",
            fecha: "1780?",
            técnica: "Acuarela",
            dimensiones: "",
            fuente: " Rues de Pékin. Bibliothèque nationale de France, département Estampes et photographie, RESERVE OE-55-4",
            descripción: "",
            periodo: "Finales del siglo XVIII",
            contexto: ["Viajes", "Trajes", "Cargadores globales"],
            procedencia: "Francia",
            región: "China",
            lugar: "Pekin",
            src:"./imgs/47.png", 
            keyword: "",
            repositorio: "https://gallica.bnf.fr/ark:/12148/btv1b8452126n/f49.item",
            id: 46
        },
        {
            título: "El ciego y el paralitico", 
            autor: "Johann Theodor de Bry",
            fecha: "1596",
            técnica: "Grabado",
            dimensiones: "",
            fuente: "Emblemata secularia mira et jucunda ... Weltliche, lustige newe Kunststück der jetzigen Weltlauff fürbildende (Fráncfort, 1596)",
            descripción: "",
            periodo: "finales del siglo XVI",
            contexto: ["Emblemas", "Alegoría"],
            procedencia: "Alemania",
            región: "Europa",
            lugar: "Fráncfort",
            src:"./imgs/48.jpg", 
            keyword: "",
            repositorio: "https://bildsuche.digitale-sammlungen.de/index.html?c=viewer&bandnummer=bsb00024751&pimage=00001&v=2p&nav=&l=es",
            id: 47
        },
        {
            título: "Joseph Brown en traje de montar",
            autor: "José María Groot",
            fecha: "s/f",
            técnica: "Acuarela y tinta sobre cartón",
            dimensiones: "24.7 x 17.2cm",
            fuente: "Biblioteca del University College, Londres. MS ADD 302/6/2",
            descripción: "",
            periodo: "Primera mitad siglo XIX",
            contexto: ["Viajes", "Diplomacia", "Retrato", "Mulas"],
            procedencia: "Colombia",
            región: "Montañas andinas Nueva Granada",
            lugar: "",
            src:"./imgs/49.png", 
            keyword: "",
            repositorio: "",
            id: 1
        },    {
            título: "The Author in the Travelling Costume of the Country",
            autor: "Charles Stuart Cochrane",
            fecha: "1825",
            técnica: "Grabado",
            dimensiones: "",
            fuente: "Charles Stuart Cochrane, Journal of a Residence and Travels in Colombia, During the Years 1823 and 1824 (In Two volumes), (Londres: Henry Colburn, 1825)",
            descripción: "",
            periodo: "Primera mitad siglo XIX",
            contexto: ["Viajes", "Comercio", "Retrato", "Mulas"],
            procedencia: "Inglaterra",
            región: "Montañas andinas Nueva Granada",
            lugar: "",
            src:"./imgs/50.png", 
            keyword: "",
            repositorio: "https://archive.org/details/journalofresiden11825coch/page/n11/mode/2up",
            id: 1
        },
        {
            título: "Le Docteur Saffray",
            autor: "Charles Saffray. Alphonse Neuville (Dibj.)",
            fecha: "1873",
            técnica: "Grabado",
            dimensiones: "",
            fuente: "Charles Saffray, Voyage à la Nouvelle Grenade. Le Tour de monde, 26, 1973",
            descripción: "",
            periodo: "Segunda mitad siglo XIX",
            contexto: ["Viajes", "Prensa", "Retrato", "Mulas"],
            procedencia: "Francia",
            región: "Montañas andinas Nueva Granada",
            src:"./imgs/51.png", 
            keyword: "",
            repositorio: "https://gallica.bnf.fr/ark:/12148/bpt6k104971v/f108.item",
            id: 50
        },
        {
            título: "Carguero en la montaña de Sonsón",
            autor: "Ramón Torres Méndez",
            fecha: "1910",
            técnica: "Grabado",
            dimensiones: "",
            fuente: "Álbum de costumbres colombianas. Según dibujos del Señor Ramón Torres, Publicado por la Junta Nacional del Primer Centenario de la Proclamación de la Independencia de la República de Colombia. Edición Ed. Victor Sperling, Leipzig, 1910",
            descripción: "Lámina impresa en la edición de 1910 hecha para conmemorar el centenario del grito de la independencia. Este ejemplar se puso en la urna centenaria que fue abierta en el 2010 por Samuel Moreno Rojas y Álvaro Uribe Vélez alcalde de Bogotá y presidente de Colombia, respectivamente.",
            periodo: "Primera mitad siglo XX",
            contexto: ["Centenario", "Nación", "Costumbres", "Memoria"],
            procedencia: "Colombia",
            región: "Montañas andinas de Colombia",
            lugar: "Antioquia",
            src:"./imgs/52.png", 
            keyword: "",
            repositorio: "",
            id: 51
        },
        {
            título: "Carguero en la montaña de Sonsón",
            autor: "Ramón Torres Méndez",
            fecha: "1934",
            técnica: "Grabado",
            dimensiones: "El grabado de Ramón Tores Méndez sirve como ilustración de un relato de Manuel María Mallarino acerca de su experiencia atravesando en camino del Quindío. El artículo está en la sección páginas olvidadas de la revista Senderos, el órgano oficial de la Biblioteca Nacional a cargo de Daniel Samper Ortega",
            fuente: "Manuel María Mallarino. La muerte a cada paso. Senderos. Organo de la Biblioteca Nacional de Colombia, 1934",
            descripción: "",
            periodo: "Primera mitad siglo XX",
            contexto: ["Nación", "Costumbres", "Memoria"],
            procedencia: "Colombia",
            región: "Montañas andinas de Colombia",
            lugar: "Camino del Quindío",
            src:"./imgs/53.png", 
            keyword: "",
            repositorio: "https://catalogoenlinea.bibliotecanacional.gov.co/client/es_ES/search/asset/137993",
            id: 52
        },
        {
            título: "Chircales",
            autor: "Marta Rodríguez. Jorge Silva",
            fecha: "1966-1971",
            técnica: "Fotograma de Cortometraje, 16mm",
            dimensiones: "",
            fuente: "",
            descripción: "",
            periodo: "Segunda mitad siglo XX",
            contexto: ["Cinematografía", "Documental", "Crítica social"],
            procedencia: "Colombia",
            región: "Montañas andinas de Colombia",
            lugar: "Bogotá",
            src:"./imgs/54.png", 
            keyword: "",
            repositorio: "https://www.proimagenescolombia.com/secciones/cine_colombiano/peliculas_colombianas/pelicula_plantilla.php?id_pelicula=1566",
            id: 53
        },
        {
            título: "Adelante",
            autor: "Grosso",
            fecha: "1984",
            técnica: "Impreso, Caricatura",
            dimensiones: "",
            fuente: "El Tiempo, Bogotá, marzo de 1984",
            descripción: "",
            periodo: "Segunda mitad siglo XX",
            contexto: ["Prensa", "Caricatura", "Crítica social", "Sátira"],
            procedencia: "Colombia",
            región: "Bogotá",
            lugar: "Bogotá",
            src:"./imgs/55.png", 
            keyword: "",
            repositorio: "",
            id: 54
        },
        {
            título: "Camino a Nóvita en la montaña de Tamaná. Enciclopedia Salvat",
            autor: "Atribuido erróneamente a Manuel María Paz",
            fecha: "1977",
            técnica: "Impreso",
            dimensiones: "",
            fuente: "Enciclopedia de arte colombiano Salvat, volumen VII, Colombia pintoresca.",
            descripción: "Se pone en el contexto de un discurso sobre el 'arte nacional'. 'Esta lámina, por cierto graciosa y realista, ha sido reproducida repetidas veces como ejemplo que encarna lo testimonial y de ingenua concepción, características no sólo de Paz, sino también de otros artistas de la Comisión corográfica'. En la introducción de la obra se evidencia un modo teleológico de tramar la historia: 'esos hombres consiguieron dejarnos esa deliciosa visión de una Colombia pintoresca, viva, llena a veces de grandes contrastes fecundos, de horizontes prometedores, de hombres y de mujeres que ya tenían conciencia de que estaban empezando, solos, una larga y venturosa andadura'",
            periodo: "Segunda mitad siglo XX",
            contexto: ["Arte", "Nación", "Memoria"],
            procedencia: "",
            región: "",
            lugar: "",
            src:"./imgs/56.png", 
            keyword: "",
            repositorio: "",
            id: 55
        },
        {
            título: "Portada Imperial Eyes",
            autor: "Mary Louis Pratt",
            fecha: "1992",
            técnica: "Portada",
            dimensiones: "",
            fuente: "Mary Louis Pratt, Imperial eyes. TRavel writing and transculturation, (Londres, Nueva York: Routledge, 1992)",
            descripción: "Imagen tomada de la lámina “El monte de la Agonía de Edouard André, 1879. Publicada en Le tour de monde. La imagen es de una época posterior a la trabajada por Pratt en su libro. En la edición en español de 2011 está lámita ilsutra el capítulo sobre los viajeros de la primera mitad del siglo XIX como vanguardia del capitalismo y de la extensión imperial",
            periodo: "Segunda mitad siglo XX",
            contexto: ["Academia", "Antropología", "Literatura comparada","Decolonialidad"],
            procedencia: "Estados Unidos",
            región: "Montañas andinas de Colombia",
            lugar: "",
            src:"./imgs/57.png", 
            keyword: "",
            repositorio: "https://openlibrary.org/works/OL4095821W/Imperial_eyes",
            id: 56
        },
        {
            título: "s/t. Auguste Le Moyne. El revés de la nación",
            autor: "Margarita Serje de la Osa",
            fecha: "2011",
            técnica: "Lámina de libro",
            dimensiones: "",
            fuente: "El revés de la nación. Territorios salvajes, fronteras y tierras de nadie (Bogotá: Universidad de los Andes, 2011)",
            descripción: "Tomada de la lámina de Le Moyne, 1828. El carguero es usado como una figura, semejante a la de los colono de la frontera fluida que los discursos que justifican la intervención estatal suelen representar como 'baldía'.",
            periodo: "Siglo XXI",
            contexto: ["Academia", "Antropología", "Decolonialidad"],
            procedencia: "Colombia",
            región: "Fronteras, baldíos, tierras salvajes",
            lugar: "",
            src:"./imgs/58.png", 
            keyword: "",
            repositorio: "https://appsciso.uniandes.edu.co/sip/data/pdf/El%20Reves%20de%20la%20Nacion%20final.pdf",
            id: 57
        },
        {
            título: "Portada del libro “Por los llanos del Piedemonte",        autor: "Carl Henrik LangebaekSantiago Giraldo, Alejandro Bernal, Silvia Monroy, Andrés Barragán",
            fecha: "200",
            técnica: "Portada de libro",
            dimensiones: "",
            fuente: "Por los caminos del Piedemonte. Una historia de las comunicaciones entre los Andes Orientales y los Llanos. Siglos XVI a XIX",
            descripción: "Usan la imagen de carguero atribuida a Manuel María Paz de 1853. Es una imagen del viaje de la Comisión corográfica al Chocó para un libro que se refiere a los andes orientales y los llanos, (Bogotá: Universidad de los Andes, 2000)",
            periodo: "Siglo XXI",
            contexto: ["Academia", "Antropología", "Arqueología"],
            procedencia: "Colombia",
            región: "Montaás Andinas de Colombia",
            lugar: "Pie de monte llanos orientales",
            src:"./imgs/59.png", 
            keyword: "",
            repositorio: "https://cienciassociales.uniandes.edu.co/antropologia/publicaciones/por-los-caminos-del-piedemonte-una-historia-de-las-comunicaciones-entre-los-andes-orientales-y-los-llanos-siglos-xvi-a-xix/",
            id: 58
        },
        {
            título: "Afiche Maestría en Historia Universidad Tecnológica de Pereira",
            autor: "Universidad Tecnológica de Pereira",
            fecha: "2018",
            técnica: "Afiche publicitario",
            dimensiones: "",
            fuente: "Página Web Universidad Tecnológica de Pereira",
            descripción: "",
            periodo: "Siglo XXI",
            contexto: ["Academia", "Publicidad", "Historia"], 
            procedencia: "Colombia",
            región: "Identidad regional Antioquia y Eje cafetero",
            lugar: "Pereira",
            src:"./imgs/60.png", 
            keyword: "",
            repositorio: "https://comunicaciones.utp.edu.co/noticias/37593/inscripciones-abiertas-maestria-en-historia",
            id: 59
        },
        {
            título: "Logo de la Maestría en Historia, Universidad Tecnológica de Pereira",
            autor: "Universidad Tecnológica de Pereira",
            fecha: "2019",
            técnica: "Logo",
            dimensiones: "",
            fuente: "Página Web Universidad Tecnológica de Pereira",
            descripción: "",
            periodo: "Siglo XXI",
            contexto: ["Academia", "Publicidad", "Historia"],
            procedencia: "Colombia",
            región: "Identidad regional Antioquia y Eje cafetero",
            lugar: "Pereira",
            src:"./imgs/61.png", 
            keyword: "",
            repositorio: "https://comunicaciones.utp.edu.co/noticias/51243/leccion-inaugural-maestria-en-historia-con-la-comision-de-la-verdad",
            id: 60
        },
        {
            título: "Cartel convocatoria Revista H-art. Dossier: Colombia, siglo XIX: viajes, intercambios y otras formas de circulación.",
            autor: "Revista H-art, Universidad de los Andes",
            fecha: "2019",
            técnica: "Afiche publicitario",
            dimensiones: "",
            fuente: "Página web Revista H-art Universidad de los Andes",
            descripción: "",
            periodo: "Siglo XXI",
            contexto: ["Academia", "Publicidad", "Historia", "Historia del arte", "Literatura"],
            procedencia: "Colombia",
            región: "Bogotá",
            lugar: "Bogotá",
            src:"./imgs/62.png", 
            keyword: "",
            repositorio: "https://facartes.uniandes.edu.co/convocatorias/convocatoria-dossier-colombia-siglo-xix-viajes-intercambios-y-otras-formas-de-circulacion/",
            id: 61
        },
        {
            título: "Cartel del I Simposio internacional Colombia, siglo XIX: viajes, intercambios y otras formas de circulación",
            autor: "Universidad de los Andes",
            fecha: "2019",
            técnica: "Afiche publicitario",
            dimensiones: "",
            fuente: "Facultad de Artes y Humanidades. Facultad de Ciencias Sociales. Universidad de los Andes",
            descripción: "",
            periodo: "Siglo XXI",
            contexto: ["Academia", "Publicidad", "Historia", "Historia del arte", "Literatura"],
            procedencia: "Colombia",
            región: "Bogotá",
            lugar: "Bogotá",
            src:"./imgs/63.png", 
            keyword: "",
            repositorio: "https://facartes.uniandes.edu.co/calendario/simposio-colombia-xix/",
            id: 62
        },
        {
            título: "Cartel del XIX Congreso colombiano de Historia",
            autor: "Academia de Historia del Quindío",
            fecha: "2019",
            técnica: "Afiche publicitario",
            dimensiones: "",
            fuente: "Página Web XIX Congreso colombiano de Historia",
            descripción: "",
            periodo: "Siglo XXI",
            contexto: ["Academia", "Publicidad", "Historia"],
            procedencia: "Colombia",
            región: "Identidad regional Antioquia y Eje cafetero",
            lugar: "Armenia",
            src:"./imgs/64.png", 
            keyword: "",
            repositorio: "https://asocolhistoria.org/xix-congreso-colombiano-de-historia/",
            id: 63
        },
        {
            título: "Hombres bestia",
            autor: "Carlos Albero Osorio Monsalve. Osorión",
            fecha: "2013",
            técnica: "Dibujo",
            dimensiones: "",
            fuente: "Blog Osorión. Carlos Osorio",
            descripción: "",
            periodo: "Siglo XXI",
            contexto: ["Nación", "Región", "Memoria"],
            procedencia: "Colombia",
            región: "Antioquia",
            lugar: "Antioquia",
            src:"./imgs/65.png", 
            keyword: "",
            repositorio: "http://laobradeosorio.blogspot.com/2014_03_01_archive.html",
            id: 64
        },
        {
            título: "El silletero",
            autor: "Pascal Tissot",
            fecha: "2005",
            técnica: "Escultura",
            dimensiones: "100 x 190 cm",
            fuente: "Página Web del artista",
            descripción: "",
            periodo: "Siglo XXI",
            contexto: ["Arte", "Nación", "Memoria"],  
            procedencia: "Colombia",
            región: "",
            lugar: "",
            src:"./imgs/66.png", 
            keyword: "",
            repositorio: "https://www.artelista.com/obra/9478059898112354-elsilletero.html",
            id: 65
        },
        {
            título: "Imágenes del desfile de inauguración del festival iberoamericano de teatro",
            autor: "Comparsa del Quindío",
            fecha: "2012",
            técnica: "Escénica",
            dimensiones: "",
            fuente: "Festival Iberoamericano de Teatro",
            descripción: "",
            periodo: "Siglo XXI",
            contexto: ["Arte", "Teatro", "Nación", "Región", "Memoria"], 
            procedencia: "Colombia",
            región: "Montañas andinas de Colombia",
            lugar: "Camino del Quindío",
            src:"./imgs/67.png", 
            keyword: "",
            repositorio: "",
            id: 66
        },
        {
            título: "Zócalo Guatape",
            autor: "Anónimo",
            fecha: "s/f",
            técnica: "Mural",
            dimensiones: "",
            fuente: "Fotografía tomada por Juan Felipe Urueña",
            descripción: "",
            periodo: "Siglo XX",
            contexto: ["Arte", "Arte popular", "Nación", "Región", "Memoria"],
            procedencia: "Colombia",
            región: "Montañas andinas de Colombia",
            lugar: "Antioquia",
            src:"./imgs/68.png", 
            keyword: "",
            repositorio: "",
            id: 67
        },
        {
            título: "Zócalo Guatape",
            autor: "Anónimo",
            fecha: "s/f",
            técnica: "Mural",
            dimensiones: "",
            fuente: "Fotografía tomada por Juan Felipe Urueña",
            descripción: "",
            periodo: "Siglo XX",
            contexto: ["Arte", "Arte popular", "Nación", "Región", "Memoria"],
            procedencia: "Colombia",
            región: "Montañas andinas de Colombia",
            lugar: "Antioquia",
            src:"./imgs/69.png", 
            keyword: "",
            repositorio: "",
            id: 68
        },
        {
            título: "Por los caminos del Quindío (Detalle)",
            autor: "Henry Villada",
            fecha: "2017",
            técnica: "Mural",
            dimensiones: "",
            fuente: "Fotografía tomada por Juan Felipe Urueña",
            descripción: "El carguero está incluido en una secuencia narrativa que muestra una evolución progresiva que va desde los cargueros en un contexto agreste, pasando por los arrieros con sus mulas, llegando al Jeep Willis en un contexto colonizado que se ilustra con las típicas casas de las fincas cafeteras. El mural ha tomado como modelo de algunas de sus escenas, láminas de viajeros del siglo XIX. Una reproducida en el libro de John Porter Hamilton, y otra elaborada por Roulin que se refiere originalmente al camino Honda-Guaduas.",
            periodo: "Siglo XX",
            contexto: ["Arte", "Nación", "Región", "Memoria"],
            procedencia: "Colombia",
            región: "Montañas andinas de Colombia",
            lugar: "Antioquia",
            src:"./imgs/70.jpg", 
            keyword: "",
            repositorio: "",
            id: 69
        },
        {
            título: "Silla",
            autor: "s/a",
            fecha: "s/f",
            técnica: "Silla construida con bambú",
            dimensiones: "",
            fuente: "Fotografía tomada del blog de la Academia de Historia del Quindío",
            descripción: " Armazón de guadua (latas de guadua), cuyas medidas eran: de unos tres pies (91cms), largo, y de ancho, un pie (31.5 cms), ensambladas y amarradas entre sí con bejucos, provista de espaldar con una inclinación de 60°, con el fin de que el transportado pudiera juntar su espalda con la espalda del sillero.  En la parte baja de la silla se amarra una tabla, en ángulo recto, que tiene las mismas dimensiones del ancho. Vista así, toda la estructura semeja una silla sin patas.Dos fuertes pretinas a manera de arnés, situadas en los extremos de ambos bastidores de la silla, mantenían todo en ángulo recto, sirviendo al propio tiempo de brazos a los que el viajero podía asirse. Un pedazo de bambú de un pie de largo, colgaba en su parte inferior y le servía como estribo, si es que el acarreado podía considerarse como un jinete de caballería.", 
            periodo: "Siglo XXI",
            contexto: ["Arte", "Arte popular", "Nación", "Región", "Memoria"],
            procedencia: "Colombia",
            región: "Montañas andinas de Colombia",
            lugar: "Camino del Quindío",
            src:"./imgs/71.png", 
            keyword: "",
            repositorio: "http://academiadehistoriadelquindio.blogspot.com/2018/04/silleteros-y-cargueros-microhistorias.html",
            id: 70
        },
        {
            título: "Logo de la Academia de Historia del Quindío",
            autor: "s/a",
            fecha: "s/f",
            técnica: "Logo",
            dimensiones: "",
            fuente: "Tomado del blog de la Academia de Historia del Quindío",
            descripción: "",
            periodo: "Siglo XX",
            contexto: ["Región", "Nación", "Memoria"],
            procedencia: "Colombia",
            región: "Montañas andinas de Colombia",
            lugar: "Camino del Quindío",
            src:"./imgs/72.png", 
            keyword: "",
            repositorio: "http://academiadehistoriadelquindio.blogspot.com/",
            id: 71
        },
        {
            título: "Colombia de Reojo",
            autor: "Santiago Hacker",
            fecha: "2014",
            técnica: "Serie fotográfica",
            dimensiones: "",
            fuente: "Fotografía tomada por Juan Felipe Urueña",
            descripción: "Santiago Harker siguió los pasos de la Comisión Corográfica. Tomando fotografias que establcen correspondencias visuales, temáticas y geográficas con las láminas de la Comisión Corográfica ",
            periodo: "Siglo XXi",
            contexto: ["Arte", "Arte contemporáneo", "Fotografía", "Nación", "Memoria"],
            procedencia: "Colombia",
            región: "Montañas andinas de Colombia",
            lugar: ["Camino del Quindío", "Antioquia"],
            src:"./imgs/73.png", 
            keyword: "",
            repositorio: "",
            id: 72
        },
        {
            título: "La sombra del caminante",
            autor: "Ciro Guerra (Director)",
            fecha: "2004",
            técnica: "Largometraje argumental",
            dimensiones: "",
            fuente: "Proimágenes, 2004",
            descripción: "",
            periodo: "Siglo XX",
            contexto: ["Arte", "Cinemotografía", "Memoria", "Conflicto armado", "Nación"],
            procedencia: "Colombia",
            región: "Montañas andinas de Colombia",
            lugar: "Bogotá",
            src:"./imgs/74.png", 
            keyword: "",
            repositorio: "https://www.proimagenescolombia.com//secciones/cine_colombiano/peliculas_colombianas/pelicula_plantilla.php?id_pelicula=274",
            id: 73
        },
        {
            título: "Carguero. Rappi",
            autor: "Luis Fernando Medina. #Luscus",
            fecha: "2019",
            técnica: "Calcomanía. Fotomontaje",
            dimensiones: "",
            fuente: "Paro nacional de noviembre de 2019",
            descripción: "",
            periodo: "Siglo XXI",
            contexto: ["Arte", "Arte callejero", "Crítica social", "Sátira"],
            procedencia: "Colombia",
            región: "Montañas andinas de Colombia",
            lugar: "Bogotá",
            src:"./imgs/75.png", 
            keyword: "",
            repositorio: "",
            id: 74
        },
        {
            título: "Meme",
            autor: "Anónimo",
            fecha: "2019",
            técnica: "Meme. Fotomontaje",
            dimensiones: "",
            fuente: "Twitter",
            descripción: "Meme que muestra la gramática espacial del arriba/abajo, el cargador y cargado, y su potencial para hacer sátira social.",
            periodo: "Siglo XXI",
            contexto: ["Arte", "Memes", "Crítica social", "Sátira"],
            procedencia: "Colombia",
            región: "Montañas andinas de Colombia",
            lugar: "Bogotá",
            src:"./imgs/76.png", 
            keyword: "",
            repositorio: "",
            id: 75
        },    {
            título: "El paso del Quindío",
            autor: "Alejandro Gaviria",
            fecha: "2010",
            técnica: "Artículo de opinión",
            dimensiones: "",
            fuente: "El Espectador 11 Dic. 2010.",
            descripción: "Alejandro Gaviria usa a los cargueros y su travesía por el paso del Quindío como metáfora para discutir sobre la lentitud de la ejecución de las obras públicas en Colombia",
            periodo: "Siglo XXI",
            contexto: ["Prensa", "Nación"],
            procedencia: "Colombia",
            región: "Montañas andinas de Colombia",
            lugar: "Camino del Quindío",
            src:"./imgs/77.png", 
            keyword: "",
            repositorio: "https://www.elespectador.com/opinion/columnistas/alejandro-gaviria/el-paso-del-quindio-column-239854/",
            id: 76
        },
        {
            título: "Reacciones de tuiteros",
            autor: ["Madame Simone", "Laura Quintana", "Lucas Ospina", "Roberto Angulo"],
            fecha: "2019",
            técnica: "Tweet",
            dimensiones: "",
            fuente: "Twitter",
            descripción: "Tuiteros reaccionan ante un video en el que la senadora del Centro Democrático María del Rosario Guerra paga a un transeunte para que la cargue a través de una calle innundada",
            periodo: "Siglo XXI",
            contexto: ["Redes sociales", "Crítica social", "Decolonialidad"],
            procedencia: "Colombia",
            región: "Montañas andinas de Colombia",
            lugar: "Bogotá",
            src:"./imgs/78.png", 
            keyword: "",
            repositorio: "https://www.proimagenescolombia.com//secciones/cine_colombiano/peliculas_colombianas/pelicula_plantilla.php?id_pelicula=274",
            id: 77
        },
        {
            título: "Paso del Quindío II",
            autor: "José Alejandro Restrepo",
            fecha: "2007",
            técnica: "Videoinstalación",
            dimensiones: "",
            fuente: "José Alejandro Restrepo, “Viajes paradójicos”, Arte y etnografía. De artistas, textos, contextos, mapeos y paseantes, editado por Pedro Pablo Gómez, (Bogotá: Universidad Distrital,  2007) 45-52",
            descripción: "José Alejandro Restrepo, “Viajes paradójicos”, Arte y etnografía. De artistas, textos, contextos, mapeos y paseantes, editado por Pedro Pablo Gómez, (Bogotá: Universidad Distrital,  2007) 45-52",
            periodo: "Siglo XXI",
            contexto: ["Arte", "Arte Contemporáneo", "Videoarte", "Decolonialidad", "Memoria"],
            procedencia: "Colombia",
            región: "Montañas andinas de Colombia",
            lugar: "Serranía del Baudó, Chocó",
            src:"./imgs/79.png", 
            keyword: "",
            repositorio: "http://www.colarte.com/colarte/foto.asp?ver=1&idfoto=330895",
            id: 78
        },
        {
            título: "La naturaleza de las cosas: Humboldt, idas y venidas",
            autor: "Halim Badawi (Curador)",
            fecha: "2019",
            técnica: "Exposición de arte",
            dimensiones: "",
            fuente: "Museo de Arte, Universidad Nacional de Colombia",
            descripción: "",
            periodo: "Siglo XXI",
            contexto: ["Arte", "Arte Contenmporáneo", "Memoria", "Decolonialidad"],
            procedencia: "Colombia",
            región: ["Montañas andinas de Colombia", ""],
            lugar: "Bogotá",
            src:"./imgs/80.png", 
            keyword: "",
            repositorio: "https://www.youtube.com/watch?v=w5rcUiGKtcc",
            id: 79
        },
        {
            título: "El reverso oscuro de la ciencia ilustrada. La naturaleza de las cosas: Humboldt idas y venidas.",
            autor: "Felipe Sánchez Villareal",
            fecha: "2019",
            técnica: "Reseña Exposición de arte",
            dimensiones: "",
            fuente: "Semana 9 de mayo, 2019",
            descripción: "",
            periodo: "Siglo XXI",
            contexto: ["Arte", "Arte Contemporáneo", "Memoria", "Decolonialidad"],
            procedencia: "Colombia",
            región: "Montañas andinas de Colombia",
            lugar: "Bogotá",
            src:"./imgs/81.png", 
            keyword: "",
            repositorio: "https://www.semana.com/arte/articulo/el-reverso-oscuro-de-la-ciencia-ilustrada-la-naturaleza-de-las-cosas-humboldt-idas-y-venidas/75407/",
            id: 80
        },
        {
            título: "El carguero",
            autor: "Jean Lucumi",
            fecha: "2019",
            técnica: "Performance de larga duración",
            dimensiones: "",
            fuente: "Laboratorio de creación Experimenta SUR 2019",
            descripción: "Estas son las palabras del artista: '(…) Con esto recuerdo que alguien me pregunto si esa labor del carguero aún existía, mi respuesta fue que sí, cada persona que trabaja en una constructora y lleva sobre sus hombros bultos de cemento es un carguero, cada persona que ayuda a descargar bultos de comida en una plaza de mercado, por una paga que no es muy buena es un carguero, no lo mal entiendan, no estoy des-meritando la labor del carguero, es más un asunto de encontrar la manera de narrarlo sin ponerlo a repetir la lógica colonial de cosificarlo y validarlo desde eso que se espera soporte con su cuerpo'.",
            periodo: "Siglo XXI",
            contexto: ["Arte", "Arte Contemporáneo", "Performance", "Memoria", "Decolonialidad"],
            procedencia: "Colombia",
            región: "Montañas andinas de Colombia",
            lugar: "Bogotá",
            src:"./imgs/82.png", 
            keyword: "",
            repositorio: "https://vimeo.com/336947635",
            id: 81
        },
        {
            título: "Gold in the morning",
            autor: "Alfredo Jaar",
            fecha: "1985",
            técnica: "Fotografía en tres cajas de luz",
            dimensiones: "25 x 40 cm ",
            fuente: "Colección Proyecto Bachué, Bogotá. Foto: Goethe-Institut/Urniator Studio, Juan David Padilla Vega",
            descripción: "Esta obra fue expuesta en la Exposición La naturaleza de las cosas: Humboldt, idas y venidas",
            periodo: "Siglo XXI",
            contexto: ["Arte", "Arte Contemporáneo", "Memoria", "Decolonialidad"],
            procedencia: "Chile",
            región: "Brazil",
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
    	child_ctx[2] = list[i].título;
    	child_ctx[3] = list[i].autor;
    	child_ctx[4] = list[i].fecha;
    	child_ctx[5] = list[i].técnica;
    	child_ctx[6] = list[i].fuente;
    	child_ctx[7] = list[i].src;
    	child_ctx[8] = list[i].keyword;
    	child_ctx[9] = list[i].contexto;
    	child_ctx[10] = list[i].procedencia;
    	child_ctx[11] = list[i].descripción;
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
    	let t1_value = /*título*/ ctx[2] + "";
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
    	let t7_value = /*técnica*/ ctx[5] + "";
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
    			attr_dev(img, "alt", /*título*/ ctx[2]);
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
    	let t1_value = /*título*/ ctx[2] + "";
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
    	let t7_value = /*técnica*/ ctx[5] + "";
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
    			attr_dev(img, "alt", /*título*/ ctx[2]);
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

    // (22:2) {#each images as {título, autor, fecha, técnica, fuente, src, keyword, contexto, procedencia, descripción}}
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
    		source: "(22:2) {#each images as {título, autor, fecha, técnica, fuente, src, keyword, contexto, procedencia, descripción}}",
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
    			h1.textContent = "Catálogo de Imagenes de Cargueros";
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
