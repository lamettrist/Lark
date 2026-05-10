/*
    This file is so modular it can just be reused for any future AI project I work on, lol
*/
import OpenAI from 'openai'

export interface modelSchema {
    name: string,
    id: string,
    modelID: string,
    provider?: OpenAI,
    maxTokens?: number;
}

const digitalOceanProvider = new OpenAI({
    apiKey:  process?.env.DIGITALOCEAN_KEY,
    baseURL: 'https://inference.do-ai.run/v1',
})

export const hackClubProvider = new OpenAI({
    apiKey: process?.env.HACKCLUB_KEY,
    baseURL: "https://ai.hackclub.com/proxy/v1",
})

export const models: modelSchema[] = [
    {
      'name': 'large',
      'id': 'large',
      'modelID': 'openai-gpt-oss-120b',
      'provider': digitalOceanProvider,
    },
]
