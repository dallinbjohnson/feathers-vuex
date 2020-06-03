/*
eslint
@typescript-eslint/no-explicit-any: 0
*/
import { reactive, computed, toRefs, isRef, watch, Ref } from 'vue'
import { Params } from './utils'

interface UseGetOptions {
  model: Function
  id: null | string | number | Ref<null> | Ref<string> | Ref<number>
  params?: Params | Ref<Params>
  queryWhen?: Ref<Function>
  local?: boolean
  immediate?: boolean
}
interface UseGetState {
  item: Ref<any>
  isPending: boolean
  hasBeenRequested: boolean
  hasLoaded: boolean
  error: null | Error
  isLocal: boolean
}
interface UseGetData {
  item: Ref<any>
  servicePath: Ref<string>
  isPending: Ref<boolean>
  hasBeenRequested: Ref<boolean>
  hasLoaded: Ref<boolean>
  isLocal: Ref<boolean>
  error: Ref<Error>
  get: Function
}

export default function get(options: UseGetOptions): UseGetData {
  const defaults = {
    model: null,
    id: null,
    params: null,
    queryWhen: computed((): boolean => true),
    local: false,
    immediate: true
  }
  const { model, id, params, queryWhen, local, immediate } = Object.assign({}, defaults, options)

  function getId(): null | string | number {
    return isRef(id) ? id.value : id || null
  }
  function getParams(): Params {
    return isRef(params) ? params.value : params
  }

  const servicePath = computed<string>(() => model.servicePath)
  const state = reactive<UseGetState>({
    item: computed(() => {
      const getterId = isRef(id) ? id.value : id
      const getterParams = isRef(params)
        ? Object.assign({}, params.value)
        : params == null
        ? params
        : { ...params }
      if (getterParams != null) {
        return model.getFromStore(getterId, getterParams) || null
      } else {
        return model.getFromStore(getterId) || null
      }
      // return model.store.state[model.servicePath].keyedById[id.value] || null
      // return model.getFromStore(id.value) || null
    }),
    isPending: false,
    hasBeenRequested: false,
    hasLoaded: false,
    error: null,
    isLocal: local
  })

  function get<T>(id, params?: Params): T {
    const idToUse = isRef(id) ? id.value : id
    const paramsToUse = isRef(params) ? params.value : params

    if (idToUse != null && queryWhen.value && !state.isLocal) {
      state.isPending = true
      state.hasBeenRequested = true

      const promise = paramsToUse != null ? model.get(idToUse, paramsToUse) : model.get(idToUse)

      return promise
        .then(response => {
          state.isPending = false
          state.hasLoaded = true
          return response
        })
        .catch(error => {
          state.isPending = false
          state.error = error
          return error
        })
    }
  }

  watch(
    // eslint-disable-next-line @typescript-eslint/explicit-function-return-type
    [() => getId(), () => getParams()],
    ([id, params]) => get(id as string | number, params as Params),
    { immediate }
  )

  return {
    servicePath,
    ...toRefs(state),
    get
  }
}
