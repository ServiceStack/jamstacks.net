import { createApp, reactive, ref } from "vue"
import { JsonApiClient, $1, $$ } from "@servicestack/client"
import ServiceStackVue, { useMetadata } from "@servicestack/vue"
import HelloApi from "./components/HelloApi.mjs"
import GettingStarted from "./components/GettingStarted.mjs"
import ShellCommand from "./components/ShellCommand.mjs"
import VueComponentGallery from "./components/VueComponentGallery.mjs"
import VueComponentLibrary from "./components/VueComponentLibrary.mjs"
import ProjectTemplate from "./components/ProjectTemplate.mjs"

let client = null, Apps = []
let AppData = {
    init:false
}
export { client, Apps }

/** Simple inline component examples */
const Hello = {
    template: `<b>Hello, {{name}}!</b>`,
    props: { name:String }
}
const Counter = {
    template: `<b @click="count++">Counter {{count}}</b>`,
    setup() {
        let count = ref(1)
        return { count }
    }
}
const Plugin = {
    template:`<div>
        <PrimaryButton @click="show=true">Open Modal</PrimaryButton>
        <ModalDialog v-if="show" @done="show=false">
            <div class="p-8">Hello @servicestack/vue!</div>
        </ModalDialog>
    </div>`,
    setup() {
        const show = ref(false)
        return { show }
    }
}

/** Shared Components */
const Components = {
    HelloApi,
    GettingStarted,
    ShellCommand,
    Hello,
    Counter,
    Plugin,
    VueComponentGallery,
    VueComponentLibrary,
    ProjectTemplate,
}

const alreadyMounted = el => el.__vue_app__ 

/** Mount Vue3 Component
 * @param sel {string|Element} - Element or Selector where component should be mounted
 * @param component 
 * @param [props] {any} */
export function mount(sel, component, props) {
    if (!AppData.init) {
        init(globalThis)
    }
    const el = $1(sel)
    if (alreadyMounted(el)) return
    const app = createApp(component, props)
    app.provide('client', client)
    Object.keys(Components).forEach(name => {
        app.component(name, Components[name])
    })
    app.use(ServiceStackVue)
    app.component('RouterLink', ServiceStackVue.component('RouterLink'))
    app.mount(el)
    Apps.push(app)
    return app
}

export function mountAll() {
    $$('[data-component]').forEach(el => {
        if (alreadyMounted(el)) return
        let componentName = el.getAttribute('data-component')
        if (!componentName) return
        let component = Components[componentName] || ServiceStackVue.component(componentName)
        if (!component) {
            console.error(`Could not create component ${componentName}`)
            return
        }

        let propsStr = el.getAttribute('data-props')
        let props = propsStr && new Function(`return (${propsStr})`)() || {}
        mount(el, component, props)
    })
}

/** @param {any} [exports] */
export function init(exports) {
    if (AppData.init) return
    client = JsonApiClient.create('https://blazor-gallery-api.jamstacks.net')
    const { loadMetadata } = useMetadata()
    loadMetadata({
        olderThan: 24 * 60 * 60 * 1000, //1day
        resolvePath: `https://blazor-gallery-api.jamstacks.net/metadata/app.json`
    })
    AppData = reactive(AppData)
    AppData.init = true
    mountAll()

    if (exports) {
        exports.client = client
        exports.Apps = Apps
    }
}

/* used in :::sh and :::nuget CopyContainerRenderer */
globalThis.copy = function(e) {
    e.classList.add('copying')
    let $el = document.createElement("textarea")
    let text = (e.querySelector('code') || e.querySelector('p')).innerHTML
    $el.innerHTML = text
    document.body.appendChild($el)
    $el.select()
    document.execCommand("copy")
    document.body.removeChild($el)
    setTimeout(() => e.classList.remove('copying'), 3000)
}