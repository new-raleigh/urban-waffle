import { Construct } from "constructs";
import { Repository } from "../.gen/providers/github/repository";
import { ActionsSecret } from "../.gen/providers/github/actions-secret";

import { Workspace } from "../.gen/providers/tfe/workspace";

export class OranizationRepository extends Construct {
  constructor(scope: Construct, id: string, name: string, tfeOrganization: string, tfeToken: string) {
    super(scope, id);

    const organizationRepository = new Repository(this, "organization_repository", {
        name: name,
        description: "A repository for the organization",
        visibility: "private",
        hasIssues: true,
        hasProjects: true,
        hasWiki: true,
        autoInit: true,
    });

    new ActionsSecret(this, "tfe_token", {
    // const TFEToken = new ActionsSecret(this, "tfe_token", {
        repository: organizationRepository.name,
        secretName: "TFE_TOKEN",
        encryptedValue: tfeToken,
    });

    // const organizationWorkspace = new Workspace(this, "organization_workspace", {
    new Workspace(this, "organization_workspace", {      
      name: name,
      description: "A workspace for the organization located at " + organizationRepository.htmlUrl,
      organization: tfeOrganization,
    });
  }
}
