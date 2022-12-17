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

    // checks to see if the process.env.TFE_TOKEN is undefined and throws an error if it is.
    if (process.env.TFE_TOKEN === undefined || process.env.TFE_TOKEN === "") {
      throw new Error("TFE_TOKEN is undefined or empty. Please set the TFE_TOKEN environment variable to your Terraform Cloud API token.");
    }
    if (process.env.TFE_ORGANIZATION_TOKEN === undefined || process.env.TFE_ORGANIZATION_TOKEN === "") {
      throw new Error("TFE_ORGANIZATION_TOKEN is undefined or empty. Please set the TFE_ORGANIZATION_TOKEN environment variable to your Terraform Cloud API token.");
    }
    // checks to see if the process.env.GH_ACCESS_TOKEN is undefined and throws an error if it is.
    if (process.env.GH_ACCESS_TOKEN === undefined || process.env.GH_ACCESS_TOKEN === "") {
      throw new Error("GH_ACCESS_TOKEN is undefined or empty. Please set the GH_ACCESS_TOKEN environment variable to your GitHub API token.");
    }

    new TfeProvider(this, "tfe", {
      token: process.env.TFE_ORGANIZATION_TOKEN,
    });

    new GithubProvider(this, "github", {
      token: process.env.GH_ACCESS_TOKEN,
      owner: "new-raleigh"
    });

    new OranizationRepository(this, "posts", {
      name: "posts",
      tfeOrganization: "new-raleigh",
      tfeToken: process.env.TFE_TOKEN,
      tfeOrganizationToken: process.env.TFE_ORGANIZATION_TOKEN,
    });

    new OranizationRepository(this, "posts-front-end", {
      name: "posts-front-end",
      tfeOrganization: "new-raleigh",
      tfeToken: process.env.TFE_TOKEN,
      tfeOrganizationToken: process.env.TFE_ORGANIZATION_TOKEN,
    });

    // Use the workspace data element
    const organizationWorkspaceOutputs = new DataTfeWorkspace(this, "bootstrap_workspace",{
      name:"bootstrap",
      organization:"new-raleigh",
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
  organization: "new-raleigh",
  workspaces: new NamedCloudWorkspace("bootstrap"),
  token: process.env.TFE_TOKEN,
});
app.synth();
