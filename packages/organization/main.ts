// Copyright (c) HashiCorp, Inc
// SPDX-License-Identifier: MPL-2.0
import { Construct } from "constructs";
import { App, TerraformStack, CloudBackend, NamedCloudWorkspace, TerraformOutput  } from "cdktf";
import { TfeProvider } from "./.gen/providers/tfe/provider";
import { GithubProvider } from "./.gen/providers/github/provider";
import { DataTfeWorkspace } from "./.gen/providers/tfe/data-tfe-workspace";
import { OranizationRepository } from "./lib/repository"

class MyStack extends TerraformStack {
  constructor(scope: Construct, id: string) {
    super(scope, id);
        new TfeProvider(this, "tfe", {
    });

    // checks to see if the process.env.TFE_TOKEN is undefined and throws an error if it is.
    if (process.env.TFE_TOKEN === undefined || process.env.TFE_TOKEN === "") {
      throw new Error("TFE_TOKEN is undefined or empty. Please set the TFE_TOKEN environment variable to your Terraform Cloud API token.");
    }
    // checks to see if the process.env.GITHUB_TOKEN is undefined and throws an error if it is.
    if (process.env.GITHUB_TOKEN === undefined || process.env.GITHUB_TOKEN === "") {
      throw new Error("GITHUB_TOKEN is undefined or empty. Please set the GITHUB_TOKEN environment variable to your GitHub API token.");
    }


    new GithubProvider(this, "github", {
      token: process.env.GITHUB_TOKEN,
    });

    new OranizationRepository(this, "organization_repository", "test", "NotErickG", process.env.TFE_TOKEN);

    // Use the workspace data element
    const organizationWorkspaceOutputs = new DataTfeWorkspace(this, "bootstrap_workspace",{
      name:"bootstrap",
      organization:"NotErickG",
    });

    new TerraformOutput(this, "boostrap_workspace_outputs", {
      value: organizationWorkspaceOutputs,
    });


  }
}

const app = new App();
const stack = new MyStack(app, "organization");
new CloudBackend(stack, {
  hostname: "app.terraform.io",
  organization: "NotErickG",
  workspaces: new NamedCloudWorkspace("bootstrap")
});
app.synth();
