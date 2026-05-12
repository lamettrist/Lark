import { hackClubProvider } from './models';
import { HandleToolsResponse } from './struct';

// Definitions
export const END_TURN = {
    'type': 'function',
    'name': 'end',
    'description': 'End the simulation & turn, providing a final response to the user (only use this if you are ready)',
    'parameters': {
        'type': 'object',
        'properties': {
        },
        'required': [],
    },
}

export const SEARCH = {
    'type': 'function',
    'name': 'search',
    'description': 'Search tool for our models to conduct searches on the web. Use this tool to both gather information and potential stakeholders for a project',
    'parameters': {
        'type': 'object',
        'properties': {
            'query': {
                'type': 'string',
                'description': 'The query for your search',
            }
        },
        'required': ['query'],
    },
}


/*
    This is probably the shortest way I could've made the search tool, but it works.
    I could use Exa but I need the proxy access on HackClub, so sonar works better
*/
// async function Search(query: string) {
    
//     // Spin up a silly research agent for this
//     const researchResult = await hackClubProvider.responses.create({
//         'model': 'perplexity/sonar-pro-search',
//         'input': `tell me more about ${query}`
//     })
//     console.log(researchResult.output_text);
//     return researchResult.output_text;
// }

async function Search(query: string) {
    return `Search results for query: ${query}
    1.) Jimmy Vacations, a leading company in the travel industry, has recently announced a significant investment in France. The company plans to invest $500 million over the next five years to expand its operations in the country. This investment will focus on developing new travel packages, enhancing customer service, and creating job opportunities for local communities.

    2.) The French government has welcomed the investment from Jimmy Vacations, stating that it will contribute to the growth of the tourism sector in France. The government has also expressed its commitment to supporting foreign investments that create jobs and boost the economy.

    3.) Industry experts believe that Jimmy Vacations' investment in France will have a positive impact on the country's tourism industry. It is expected to attract more tourists to France, increase competition among travel companies, and drive innovation in the sector.`;
}

// Tool Handler
export default async function HandleTools(tool: any): Promise<HandleToolsResponse> {
    console.log(tool)
    if (tool.name == 'end') {
        console.log('Ending simulation...')
        return {return: true, output: "The simulation has terminated successfully."}
    } else if (tool.name == 'search') {
        const query = JSON.parse(tool.arguments).query;
        const researchResult = await Search(query);
        return {
            return: false,
            output: `${researchResult}`
        }
    }
    return {
        return: false
    }
}

// Master Agent Tools
export const MasterAgentTools = [
    END_TURN,
    SEARCH,
]