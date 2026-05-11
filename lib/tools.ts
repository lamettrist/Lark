import { Tool } from 'openai/resources/responses/responses.js';
import { HandleToolsResponse } from './struct';

export const END_TURN = {
    'type': 'function',
    'name': 'end',
    'description': 'End the simualtion & turn, providing a final response to the user (only use this if you are ready)',
    'parameters': {
        'type': 'object',
        'properties': {
        },
        'required': [],
    },
}

export const RESEARCH = {
    'type': 'function',
    'name': 'end',
    'description': '',
    'parameters': {
        'type': 'object',
        'properties': {
        },
        'required': [],
    },
}


export default async function HandleTools(tool: any): Promise<HandleToolsResponse> {
    console.log(tool)
    if (tool.name == 'end') {
        console.log('Ending simulation...')
        return {return: true, output: "The simulation has terminated successfully."}
    }
    return {
        return: false
    }
}


/* {
        "type": "function",
        "name": "read_file",
        "description": "Reads a file",
        "parameters": {
            "type": "object",
            "properties": {
                "path": {
                    "type": "string",
                    "description": "The filepath to read the file in the current environment",
                },
                "lines": {
                    "type": "number",
                    "description": "The specific lines that will be read in the file"
                }
            },
            "required": ["path"],
        },
    },
    {
        "type": "function",
        "name": "write_file",
        "description": "Write content to a file",
        "parameters": {
            "type": "object",
            "properties": {
                "path": {
                    "type": "string",
                    "description": "The path to write to in curent environment",
                },
                "content": {
                    "type": "string",
                    "description": "The content you are trying to write to the file",
                },
                "lines": {
                    "type": "string",
                    "description": "The lines to specifically overwrite within a file"
                }
            },
            "required": ["path", "content"],
        },
    },
{
        "type": "function",
        "name": "compress_context",
        "description": "Compresses your context window (and all interactions) so you can continue your objectives.",
        "parameters": {
            "type": "object",
            "properties": {                
            },
            "required": [],
        },
    },
*/