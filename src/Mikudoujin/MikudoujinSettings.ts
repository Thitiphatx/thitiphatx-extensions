import {
    DUIButton,
    DUINavigationButton,
    SourceStateManager
} from '@paperback/types'

export const getCSEapi = async (stateManager: SourceStateManager): Promise<string> => {
    return (await stateManager.retrieve('api_key') as string) ?? ''
}
export const getResetSettings = async (stateManager: SourceStateManager): Promise<string> => {
    return (await stateManager.retrieve('reset') as string) ?? ''
}


export const settings = (stateManager: SourceStateManager): DUINavigationButton => {
    return App.createDUINavigationButton({
        id: 'settings',
        label: 'Search settings',
        form: App.createDUIForm({
            sections: () => {
                return Promise.resolve([
                    App.createDUISection({
                        id: 'content',
                        footer: 'Enter Google api key',
                        rows: async () => {
                            await Promise.all([
                                getCSEapi(stateManager),
                            ])
                            return await [
                                App.createDUIInputField({
                                    id: 'api_key',
                                    label: 'Api key',
                                    value: App.createDUIBinding({
                                        get: () => getCSEapi(stateManager),
                                        set: async (newValue) => await stateManager.store('api_key', newValue)
                                    })
                                })
                            ]
                        },
                        isHidden: false
                    })
                ])
            }
        })
    })
}

export const resetSettings = (stateManager: SourceStateManager): DUIButton => {
    return App.createDUIButton({
        id: 'reset',
        label: 'Reset to Default',
        onTap: async () => {
            await Promise.all([
                stateManager.store('api_key', null)
            ])
        }
    })
}
