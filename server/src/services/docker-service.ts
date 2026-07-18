import Docker from "dockerode";

const docker = new Docker();

export class DockerService {

    async createContainer(image: string) {

        const container = await docker.createContainer({
            Image: image,
        });

        return container;
    }

}