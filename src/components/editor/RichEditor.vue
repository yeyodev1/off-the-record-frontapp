<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { EditorContent, useEditor } from '@tiptap/vue-3'
import StarterKit from '@tiptap/starter-kit'
import { TextStyleKit } from '@tiptap/extension-text-style'
import TextAlign from '@tiptap/extension-text-align'
import Highlight from '@tiptap/extension-highlight'
import Placeholder from '@tiptap/extension-placeholder'
import CharacterCount from '@tiptap/extension-character-count'
import { ACCENT_PALETTE } from '@/config/navigation'
import AppModal from '@/components/ui/AppModal.vue'
import AppField from '@/components/ui/AppField.vue'
import AppButton from '@/components/ui/AppButton.vue'
import AppSelect from '@/components/ui/AppSelect.vue'

const props = withDefaults(
  defineProps<{ modelValue: string; placeholder?: string; minHeight?: string; compact?: boolean }>(),
  { placeholder: 'Escribe aquí…', minHeight: '160px', compact: false },
)

const emit = defineEmits<{ (e: 'update:modelValue', value: string): void; (e: 'text', value: string): void }>()

const FONTS = [
  { label: 'Editorial (serif)', value: 'var(--font-display)' },
  { label: 'Interfaz (sans)', value: 'var(--font-ui)' },
  { label: 'Monoespaciada', value: 'var(--font-mono)' },
  { label: 'Georgia', value: 'Georgia, serif' },
  { label: 'Times New Roman', value: '"Times New Roman", serif' },
  { label: 'Helvetica', value: 'Helvetica, Arial, sans-serif' },
]

const SIZES = ['13px', '15px', '17px', '19px', '22px', '26px', '32px']
const LINE_HEIGHTS = ['1.3', '1.5', '1.7', '2']

const FONT_OPTIONS = [{ value: '', label: 'Por defecto' }, ...FONTS]
const SIZE_OPTIONS = [
  { value: '', label: 'Por defecto' },
  ...SIZES.map((size) => ({ value: size, label: size.replace('px', '') })),
]
const LINE_HEIGHT_OPTIONS = [
  { value: '', label: 'Por defecto' },
  ...LINE_HEIGHTS.map((height) => ({ value: height, label: height })),
]

const colorOpen = ref(false)
const colorPos = ref({ top: 0, left: 0 })

/** Igual que en los bloques: la paleta flota en body para que nada la recorte. */
function toggleColors(event: MouseEvent) {
  if (colorOpen.value) {
    colorOpen.value = false
    return
  }

  const rect = (event.currentTarget as HTMLElement).getBoundingClientRect()
  const width = 156
  colorPos.value = {
    top: rect.bottom + 8,
    left: Math.max(12, Math.min(rect.left, window.innerWidth - width - 12)),
  }
  colorOpen.value = true
}

function onColorScroll(event: Event) {
  const target = event.target as HTMLElement | null
  if (target && typeof target.closest === 'function' && target.closest('.rich__swatches')) return
  colorOpen.value = false
}

function onColorOutside(event: MouseEvent) {
  const target = event.target as HTMLElement
  if (target.closest('.rich__swatches') || target.closest('[data-color-trigger]')) return
  colorOpen.value = false
}

onMounted(() => {
  document.addEventListener('mousedown', onColorOutside, true)
  window.addEventListener('scroll', onColorScroll, true)
})
const linkOpen = ref(false)
const linkUrl = ref('')

const editor = useEditor({
  content: props.modelValue || '',
  extensions: [
    StarterKit.configure({ heading: { levels: [2, 3, 4] }, link: { openOnClick: false } }),
    TextStyleKit,
    TextAlign.configure({ types: ['heading', 'paragraph'] }),
    Highlight.configure({ multicolor: true }),
    Placeholder.configure({ placeholder: props.placeholder }),
    CharacterCount,
  ],
  editorProps: {
    attributes: { class: 'rich__content otr-prose' },
  },
  onUpdate({ editor: instance }) {
    emit('update:modelValue', instance.getHTML())
    emit('text', instance.getText())
  },
})

watch(
  () => props.modelValue,
  (value) => {
    if (editor.value && value !== editor.value.getHTML()) {
      editor.value.commands.setContent(value || '', { emitUpdate: false })
    }
  },
)

onBeforeUnmount(() => {
  document.removeEventListener('mousedown', onColorOutside, true)
  window.removeEventListener('scroll', onColorScroll, true)
  editor.value?.destroy()
})

function openLink() {
  linkUrl.value = editor.value?.getAttributes('link').href || ''
  linkOpen.value = true
}

function applyLink() {
  const url = linkUrl.value.trim()
  if (!url) editor.value?.chain().focus().unsetLink().run()
  else editor.value?.chain().focus().extendMarkRange('link').setLink({ href: url }).run()
  linkOpen.value = false
}

function clearFormat() {
  editor.value?.chain().focus().unsetAllMarks().clearNodes().run()
}
</script>

<template>
  <div :class="['rich', { 'rich--compact': compact }]">
    <div v-if="editor" class="rich__bar">
      <!-- Tipografía -->
      <AppSelect
        class="rich__select"
        size="sm"
        title="Tipo de letra"
        placeholder="Tipo de letra"
        :model-value="editor.getAttributes('textStyle').fontFamily || ''"
        :options="FONT_OPTIONS"
        @update:model-value="
          $event
            ? editor.chain().focus().setFontFamily(String($event)).run()
            : editor.chain().focus().unsetFontFamily().run()
        "
      />

      <AppSelect
        class="rich__select rich__select--tight"
        size="sm"
        title="Tamaño"
        placeholder="Tamaño"
        :model-value="editor.getAttributes('textStyle').fontSize || ''"
        :options="SIZE_OPTIONS"
        @update:model-value="
          $event
            ? editor.chain().focus().setFontSize(String($event)).run()
            : editor.chain().focus().unsetFontSize().run()
        "
      />

      <AppSelect
        class="rich__select rich__select--tight"
        size="sm"
        title="Interlineado"
        placeholder="Interlineado"
        :model-value="editor.getAttributes('textStyle').lineHeight || ''"
        :options="LINE_HEIGHT_OPTIONS"
        @update:model-value="
          $event
            ? editor.chain().focus().setLineHeight(String($event)).run()
            : editor.chain().focus().unsetLineHeight().run()
        "
      />

      <span class="rich__sep" />

      <!-- Énfasis -->
      <button
        class="rich__btn"
        :class="{ 'rich__btn--on': editor.isActive('bold') }"
        type="button"
        title="Negrita"
        @click="editor.chain().focus().toggleBold().run()"
      >
        <i class="fa-solid fa-bold" />
      </button>
      <button
        class="rich__btn"
        :class="{ 'rich__btn--on': editor.isActive('italic') }"
        type="button"
        title="Cursiva"
        @click="editor.chain().focus().toggleItalic().run()"
      >
        <i class="fa-solid fa-italic" />
      </button>
      <button
        class="rich__btn"
        :class="{ 'rich__btn--on': editor.isActive('underline') }"
        type="button"
        title="Subrayado"
        @click="editor.chain().focus().toggleUnderline().run()"
      >
        <i class="fa-solid fa-underline" />
      </button>
      <button
        class="rich__btn"
        :class="{ 'rich__btn--on': editor.isActive('strike') }"
        type="button"
        title="Tachado"
        @click="editor.chain().focus().toggleStrike().run()"
      >
        <i class="fa-solid fa-strikethrough" />
      </button>

      <!-- Color -->
      <div class="rich__color">
        <button class="rich__btn" type="button" title="Color del texto" data-color-trigger @click="toggleColors">
          <i class="fa-solid fa-palette" />
        </button>
      </div>

      <Teleport to="body">
        <Transition name="pop">
          <div
            v-if="colorOpen"
            class="rich__swatches"
            :style="{ top: `${colorPos.top}px`, left: `${colorPos.left}px` }"
          >
            <button
              v-for="color in ACCENT_PALETTE"
              :key="color"
              class="rich__swatch"
              type="button"
              :style="{ background: color }"
              :title="color"
              @click="editor.chain().focus().setColor(color).run()"
            />
            <button
              class="rich__swatch rich__swatch--clear"
              type="button"
              title="Quitar color"
              @click="editor.chain().focus().unsetColor().run(), (colorOpen = false)"
            >
              <i class="fa-solid fa-ban" />
            </button>
          </div>
        </Transition>
      </Teleport>

      <button
        class="rich__btn"
        :class="{ 'rich__btn--on': editor.isActive('highlight') }"
        type="button"
        title="Resaltar"
        @click="editor.chain().focus().toggleHighlight({ color: '#F2C14E' }).run()"
      >
        <i class="fa-solid fa-highlighter" />
      </button>

      <span class="rich__sep" />

      <!-- Alineación y márgenes -->
      <button
        v-for="align in ['left', 'center', 'right', 'justify']"
        :key="align"
        class="rich__btn"
        :class="{ 'rich__btn--on': editor.isActive({ textAlign: align }) }"
        type="button"
        :title="`Alinear ${align}`"
        @click="editor.chain().focus().setTextAlign(align).run()"
      >
        <i :class="`fa-solid fa-align-${align}`" />
      </button>

      <span class="rich__sep" />

      <!-- Listas y bloques -->
      <button
        class="rich__btn"
        :class="{ 'rich__btn--on': editor.isActive('bulletList') }"
        type="button"
        title="Lista con viñetas"
        @click="editor.chain().focus().toggleBulletList().run()"
      >
        <i class="fa-solid fa-list-ul" />
      </button>
      <button
        class="rich__btn"
        :class="{ 'rich__btn--on': editor.isActive('orderedList') }"
        type="button"
        title="Lista numerada"
        @click="editor.chain().focus().toggleOrderedList().run()"
      >
        <i class="fa-solid fa-list-ol" />
      </button>
      <button
        class="rich__btn"
        :class="{ 'rich__btn--on': editor.isActive('blockquote') }"
        type="button"
        title="Cita"
        @click="editor.chain().focus().toggleBlockquote().run()"
      >
        <i class="fa-solid fa-quote-left" />
      </button>
      <button
        class="rich__btn"
        :class="{ 'rich__btn--on': editor.isActive('link') }"
        type="button"
        title="Enlace"
        @click="openLink"
      >
        <i class="fa-solid fa-link" />
      </button>

      <span class="rich__sep" />

      <button class="rich__btn" type="button" title="Deshacer" @click="editor.chain().focus().undo().run()">
        <i class="fa-solid fa-rotate-left" />
      </button>
      <button class="rich__btn" type="button" title="Rehacer" @click="editor.chain().focus().redo().run()">
        <i class="fa-solid fa-rotate-right" />
      </button>
      <button class="rich__btn" type="button" title="Limpiar formato" @click="clearFormat">
        <i class="fa-solid fa-eraser" />
      </button>
    </div>

    <EditorContent class="rich__wrap" :editor="editor" :style="{ minHeight }" />

    <footer v-if="editor && !compact" class="rich__foot">
      <span>{{ editor.storage.characterCount.words() }} palabras</span>
      <span>{{ editor.storage.characterCount.characters() }} caracteres</span>
    </footer>

    <AppModal v-model="linkOpen" size="sm" title="Enlace" icon="fa-solid fa-link">
      <AppField label="URL" hint="Deja el campo vacío para quitar el enlace.">
        <input v-model="linkUrl" type="url" placeholder="https://…" @keyup.enter="applyLink" />
      </AppField>

      <template #footer>
        <AppButton variant="ghost" @click="linkOpen = false">Cancelar</AppButton>
        <AppButton icon="fa-solid fa-check" @click="applyLink">Aplicar</AppButton>
      </template>
    </AppModal>
  </div>
</template>

<style scoped lang="scss">
.rich {
  @include col(0);
  border: 1px solid var(--line);
  border-radius: var(--r-md);
  background: var(--surface-sunken);
  overflow: hidden;

  &:focus-within {
    border-color: var(--brand-line);
  }
}

.rich__bar {
  @include row(2px, center);
  flex-wrap: wrap;
  padding: var(--s-2);
  background: var(--surface);
  border-bottom: 1px solid var(--line);
  position: sticky;
  top: 0;
  z-index: 5;
}

.rich__btn {
  @include row(0, center, center);
  width: 30px;
  height: 30px;
  border-radius: var(--r-xs);
  font-size: 12px;
  color: var(--text-muted);
  transition:
    background var(--t-fast) var(--ease),
    color var(--t-fast) var(--ease);

  &:hover {
    background: var(--surface-hover);
    color: var(--text);
  }
}

.rich__btn--on {
  background: var(--brand-soft);
  color: var(--brand-strong);
}

.rich__select {
  width: 148px;
}

.rich__select--tight {
  width: 104px;
}

.rich__sep {
  width: 1px;
  height: 18px;
  margin: 0 var(--s-1);
  background: var(--line);
}

.rich__color {
  position: relative;
}

.rich__swatches {
  @include wrap(5px);
  position: fixed;
  z-index: 950;
  width: 156px;
  padding: var(--s-3);
  border-radius: var(--r-md);
  background: var(--ink-750);
  border: 1px solid var(--line-strong);
  box-shadow: var(--shadow-lg);
}

.rich__swatch {
  width: 24px;
  height: 24px;
  border-radius: var(--r-xs);
  border: 1px solid var(--line-strong);
  transition: transform var(--t-fast) var(--ease);

  &:hover {
    transform: scale(1.12);
  }
}

.rich__swatch--clear {
  background: var(--surface-hover);
  color: var(--text-dim);
  font-size: 10px;
}

.rich__wrap {
  padding: var(--s-4);
  overflow-y: auto;
  max-height: 60vh;
  @include scrollbar;

  // El contenido migrado traía imágenes incrustadas en el texto; sin tope se
  // estiran a pantalla completa dentro del editor.
  :deep(img) {
    max-width: 100%;
    max-height: 320px;
    width: auto;
    height: auto;
    border-radius: var(--r-sm);
    object-fit: contain;
  }
}

.rich__foot {
  @include row(var(--s-4), center, flex-end);
  padding: 6px var(--s-4);
  border-top: 1px solid var(--line);
  background: var(--surface);
  @include eyebrow;
  font-size: 10px;
}

.rich--compact .rich__wrap {
  padding: var(--s-3);
  max-height: 40vh;
}
</style>

<style lang="scss">
.rich__content {
  outline: none;
  font-size: 16px;

  p.is-editor-empty:first-child::before {
    content: attr(data-placeholder);
    float: left;
    height: 0;
    pointer-events: none;
    color: var(--text-dim);
  }

  a {
    color: var(--brand-strong);
    text-decoration: underline;
  }

  mark {
    border-radius: 3px;
    padding: 0 2px;
  }
}
</style>
