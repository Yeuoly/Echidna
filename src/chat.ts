import { configGetOpenAIDefaultModel, configGetOpenAIDefaultTemperature, configGetOpenAIKey, configGetOpenAIUrl } from './config'
import axios from 'axios'

export const chat = (
    system_prompt: string,
    prompt: string,
) => new Promise<string>(async (resolve) => {
    console.log(
        configGetOpenAIUrl(), configGetOpenAIKey(), configGetOpenAIDefaultModel(), configGetOpenAIDefaultTemperature()
    )
    const result = await axios.post<{
        usage: {
            prompt_tokens: number,
            completion_tokens: number,
            total_tokens: number,
            pre_token_count: number,
            pre_total: number,
            adjust_total: number,
            final_total: number
        },
        choices: {
            message: {
                role: string,
                content: string
            },
            finish_reason: string,
            index: 0
        }[]
    }>(configGetOpenAIUrl(), {
        messages: [{
            role: 'system',
            content: system_prompt
        }, {
            role: 'user',
            content: prompt
        }],
        max_tokens: 150,
        temperature: configGetOpenAIDefaultTemperature(),
        top_p: 1,
        stream: false,
        model: configGetOpenAIDefaultModel()
    }, {
        headers: {
            'Authorization': `Bearer ${configGetOpenAIKey()}`,
            'Content-Type': 'application/json',
        }
    })

    resolve(result.data.choices[0].message.content)
})