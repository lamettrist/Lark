import { StakeholderAgent } from "./agent";
import { models } from "../models";

self.onmessage = (event) => {
    const { name, description, type } = event.data;

    if (type == 'INIT') {
        const agent = new StakeholderAgent(models[0], name, description);
        agent.run();
    }
}