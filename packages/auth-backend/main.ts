import { Construct } from "constructs";
import { CognitoOptions } from './src/cognito';
import { Cognito } from './src/cognito';
// import { WebService } from './src/app';
import { App, TerraformStack, CloudBackend, NamedCloudWorkspace } from "cdktf";
import { AwsProvider } from "@cdktf/provider-aws/lib/provider";
import { DataAwsVpc } from '@cdktf/provider-aws/lib/data-aws-vpc';
import { DataAwsSubnets } from '@cdktf/provider-aws/lib/data-aws-subnets';
import { TerraformOutput } from "cdktf";
import { DataAwsRoute53Zone } from '@cdktf/provider-aws/lib/data-aws-route53-zone';
import { AcmCertificate } from '@cdktf/provider-aws/lib/acm-certificate';
// import { Route53Record } from '@cdktf/provider-aws/lib/route53-record';
import { AcmCertificateValidation } from '@cdktf/provider-aws/lib/acm-certificate-validation';
import { Route53Record } from "@cdktf/provider-aws/lib/route53-record";
export interface WebServiceProps {
  readonly domainName: string;
  readonly cognitoDomainName: string;
}

export class Authorization extends TerraformStack {
  constructor(scope: Construct, id: string, props: WebServiceProps) {
    super(scope, id);
    const defaultVpc = new DataAwsVpc(this, 'vpc', {
      default: true
    });
    new TerraformOutput(this, 'vpc-output', {
      value: defaultVpc.id
    });

    const privateSubnets = new DataAwsSubnets(this, 'private-subnets', {
      filter: [{
        name: 'vpc-id',
        values: [defaultVpc.id]
      }],
      // tags: {
      //   Tier: 'private'
      // }
    });
    new TerraformOutput(this, 'private-subnets-output', {
      value: privateSubnets.ids
    });


    const publicSubnets = new DataAwsSubnets(this, 'public-subnets', {
      filter: [{
        name: 'vpc-id',
        values: [defaultVpc.id]
      }],
      // tags: {
      //   Tier: 'public'
      // }
    });

    new TerraformOutput(this, 'public-subnets-output', {
      value: publicSubnets.ids
    });

    const zone = new DataAwsRoute53Zone(this, 'route53-zone', {
      name: props.domainName
    });

    new Route53Record (this, 'route53-record', {
      name: "",
      zoneId: zone.id,
      type: "A",
      ttl: 300,
      records: ["172.217.10.110"]
    });

    const acmCertificate = new AcmCertificate(this, 'cert ', {
      domainName: zone.name,
      validationMethod: 'DNS',
      lifecycle: {
        createBeforeDestroy: true
      }
    });


    new AcmCertificateValidation(this, 'cert-validation', {
      certificateArn: acmCertificate.arn,
      validationRecordFqdns: [acmCertificate.domainValidationOptions.get(0).resourceRecordName]
    });


    const cognitoOptions: CognitoOptions = {
      name: "cdktf-aws-elb-cognito-auth",
      region: "us-east-1",
      vpcId: defaultVpc.id,
      privateSubnetIds: privateSubnets.ids,
      publicSubnetIds: publicSubnets.ids,
      webservice: {
        certificateArn: acmCertificate.arn,
        instanceType: "t3.micro",
        minSize: 2,
        maxSize: 4,
        desiredCapacity: 2,
        authenticationPath: "/users/*",
      },
      cognito: {
        domain: props.cognitoDomainName,
        autoVerifiedAttributes: ["phone_number"],
        mfaConfiguration: "OFF",
        oauthFlows: ["code"],
        oauthScopes: ["openid"],
        callbackUrls: ["https://temporary.us-east-1.elb.amazonaws.com/oauth2/idpresponse"],
        passwordPolicy: {
          minimumLength: 8,
          requireLowercase: true,
          requireNumbers: true,
          requireSymbols: true,
          requireUppercase: true,
          temporaryPasswordValidityDays: 7
        },
        schema: [{
          name: "email",
          attributeDataType: "String",
          developerOnlyAttribute: false,
          mutable: false,
          required: true,
          stringAttributeConstraints: {
            maxLength: "2048",
            minLength: "0"
          }
        }]
      }
    }
    new AwsProvider(this, "aws", {
      region: "us-east-1",
      accessKey: assertAwsAccessKey(process.env.AWS_ACCESS_KEY_ID),
      secretKey: assertAwsSecretAccessKey(process.env.AWS_SECRET_ACCESS_KEY),
    });

    const cognito = new Cognito(this, 'cognito', cognitoOptions);
    cognito;
    // new WebService(this, 'webservice', {
    //   userPoolArn: cognito.userPoolArn,
    //   userPoolClientId: cognito.userPoolClientId,
    //   config: cognitoOptions,
    // });

  }
}

const app = new App();
const stack = new Authorization(app, 'authorization-stack', {
  domainName: "dev.noterickg.com",
  cognitoDomainName: "noterickg-dev"
});

new CloudBackend(stack, {
  hostname: "app.terraform.io",
  organization: "new-raleigh",
  workspaces: new NamedCloudWorkspace("auth-backend"),
  token: process.env.TFE_TOKEN,
});


app.synth();


// function to see if the process.env.AWS_ACCESS_KEY_ID is undefined or empty
// throw an error if it is
export function assertAwsAccessKey(awsAccessKeyId: string | undefined): string {
  if (awsAccessKeyId === undefined || awsAccessKeyId === "") {
    throw new Error("AWS_ACCESS_KEY_ID is undefined or empty. Please set the AWS_ACCESS_KEY_ID environment variable to your AWS Access Key ID.");
  }
  return awsAccessKeyId;
}

// function to see if the process.env.AWS_SECRET_ACCESS_KEY is undefined or empty
// throw an error if it is
export function assertAwsSecretAccessKey(awsSecretAccessKey: string | undefined): string {
  if (awsSecretAccessKey === undefined || awsSecretAccessKey === "") {
    throw new Error("AWS_SECRET_ACCESS_KEY is undefined or empty. Please set the AWS_SECRET_ACCESS_KEY environment variable to your AWS Secret Access Key.");
  }
  return awsSecretAccessKey;
}
