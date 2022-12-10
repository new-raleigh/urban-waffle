// Copyright (c) HashiCorp, Inc
// SPDX-License-Identifier: MPL-2.0
import { Construct } from "constructs";
import { App, TerraformStack, CloudBackend, NamedCloudWorkspace, TerraformOutput  } from "cdktf";
import { TfeProvider } from "./.gen/providers/tfe/provider";
import { DataTfeWorkspace } from "./.gen/providers/tfe/data-tfe-workspace";

class MyStack extends TerraformStack {
  constructor(scope: Construct, id: string) {
    super(scope, id);

    // define resources here
    // this workspace manages the organization
    new TfeProvider(this, "tfe", {
    });

    // Use the workspace data element
    const organizationWorkspaceOutputs = new DataTfeWorkspace(this, "organization_workspace",{
      name:"organization",
      organization:"NotErickG",
    });

    new TerraformOutput(this, "organization_workspace_outputs", {
      value: organizationWorkspaceOutputs,
    });


  }
}

const app = new App();
const stack = new MyStack(app, "organization");
new CloudBackend(stack, {
  hostname: "app.terraform.io",
  organization: "NotErickG",
  workspaces: new NamedCloudWorkspace("organization")
});
app.synth();
