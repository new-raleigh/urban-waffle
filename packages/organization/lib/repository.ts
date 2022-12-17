import { Construct } from "constructs";
// import { Repository } from "../.gen/providers/github/repository";
// import { ActionsSecret } from "../.gen/providers/github/actions-secret";
import { Workspace } from "../.gen/providers/tfe/workspace";

// create an interface called Props that has the following properties
// name: string
// tfeOrganization: string
// tfeToken: string
interface Props {
  name: string;
  tfeOrganization: string;
  tfeToken: string;
  tfeOrganizationToken: string;
}

export class OranizationRepository extends Construct {

  constructor(scope: Construct, id: string, props: Props) {
    super(scope, id);

    // const organizationRepository = new Repository(this, "organization_repository", {
    //     name: props.name,
    //     description: "A repository for the organization",
    //     visibility: "private",
    //     hasIssues: true,
    //     hasProjects: true,
    //     hasWiki: true,
    //     autoInit: true,
    // });

    // new ActionsSecret(this, "tfe_token", {
    // // const TFEToken = new ActionsSecret(this, "tfe_token", {
    //     repository: organizationRepository.name,
    //     secretName: "TFE_TOKEN",
    //     encryptedValue: Buffer.from(props.tfeToken).toString("base64"),
    // });

    // // creates an action secret for the TFE_ORGANIZATION_TOKEN
    // new ActionsSecret(this, "tfe_organization_token", {
    // // const TFEOrganizationToken = new ActionsSecret(this, "tfe_organization_token", {
    //     repository: organizationRepository.name,
    //     secretName: "TFE_ORGANIZATION_TOKEN",
    //     encryptedValue: Buffer.from(props.tfeOrganizationToken).toString("base64"),
    // });



    // const organizationWorkspace = new Workspace(this, "organization_workspace", {
    new Workspace(this, "organization_workspace", {      
      name: props.name,
      description: "A workspace for the organization",
      organization: props.tfeOrganization,
    });
  }
}
