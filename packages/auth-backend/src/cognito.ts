import { Construct } from 'constructs';
import { TerraformOutput } from 'cdktf';
//import CognitoUserPool
import { CognitoUserPool } from "@cdktf/provider-aws/lib/cognito-user-pool";
// import IamRole
import { IamRole } from "@cdktf/provider-aws/lib/iam-role";
// import iamPolicy 
import { IamPolicy } from "@cdktf/provider-aws/lib/iam-policy";
// import IamRolePolicyAttachment
import { IamRolePolicyAttachment } from "@cdktf/provider-aws/lib/iam-role-policy-attachment";
// import CognitoUserPoolClient
import { CognitoUserPoolClient } from "@cdktf/provider-aws/lib/cognito-user-pool-client";
// import CognitoUserPoolDomain
import { CognitoUserPoolDomain } from "@cdktf/provider-aws/lib/cognito-user-pool-domain";

export interface CognitoOptions {
    name: string;
    region: string;
    vpcId: string;
    privateSubnetIds: string[];
    publicSubnetIds: string[];
    webservice: {
        instanceType: string;
        minSize: number;
        maxSize: number;
        desiredCapacity: number;
        authenticationPath: string;
        certificateArn: string;
    };
    cognito: {
        domain: string;
        autoVerifiedAttributes: string[];
        mfaConfiguration: string;
        oauthFlows: string[];
        oauthScopes: string[];
        callbackUrls: string[];
        passwordPolicy: {
            minimumLength: number;
            requireLowercase: boolean;
            requireNumbers: boolean;
            requireSymbols: boolean;
            requireUppercase: boolean;
            temporaryPasswordValidityDays: number;
        };
        schema: {
            name: string;
            attributeDataType: string;
            developerOnlyAttribute: boolean;
            mutable: boolean;
            required: boolean;
            stringAttributeConstraints: {
                maxLength: string;
                minLength: string;
            }
        }[];
    };
}



export class Cognito extends Construct {
    public readonly userPoolArn: string;
    public readonly userPoolClientSecret: string;
    public readonly userPoolClientId: string;
    public readonly userPoolDomain: string;
    public readonly userPoolClientOauthScopes: string[];

    constructor(scope: Construct, name: string, config: CognitoOptions ) {
        super(scope, name);

        const snsPolicy = new IamPolicy(this, 'sns-policy', {
            policy: JSON.stringify({
                Version: "2012-10-17",
                Statement: [{
                    Effect: "Allow",
                    Action: ['sns:publish'],
                    Resource: "*"
                }]
            })
        });

        const snsRole = new IamRole(this, 'sns-role', {
            assumeRolePolicy: JSON.stringify({
                Version: "2012-10-17",
                Statement: [{
                    Effect: "Allow",
                    Principal: {
                        Service: "cognito-idp.amazonaws.com"
                    },
                    Action: "sts:AssumeRole",
                    Sid: ""
                }]
            })
        })

        new IamRolePolicyAttachment(this, 'sns-iam-attachment', {
            role: snsRole.name as string,
            policyArn: snsPolicy.arn
        });

        const userPool = new CognitoUserPool(this, 'cognito-user-pool', {
            name: config.name + '-user-pool',
            autoVerifiedAttributes: config.cognito.autoVerifiedAttributes,
            mfaConfiguration: config.cognito.mfaConfiguration,
            smsConfiguration: {
                externalId: config.name + '-external',
                snsCallerArn: snsRole.arn
            },
            passwordPolicy: {
                minimumLength: config.cognito.passwordPolicy.minimumLength,
                requireLowercase: config.cognito.passwordPolicy.requireLowercase,
                requireNumbers: config.cognito.passwordPolicy.requireNumbers,
                requireSymbols: config.cognito.passwordPolicy.requireSymbols,
                requireUppercase: config.cognito.passwordPolicy.requireUppercase,
                temporaryPasswordValidityDays: config.cognito.passwordPolicy.temporaryPasswordValidityDays
            },
            schema: config.cognito.schema,
        });

        new CognitoUserPoolDomain(this, 'cognito-domain', {
            // generate a idempotent domain name
            domain: config.cognito.domain,
            certificateArn: config.webservice.certificateArn,
            userPoolId: userPool.id
        })

        const client = new CognitoUserPoolClient(this, 'cognito-client', {
            name: config.name + '-client',
            allowedOauthFlowsUserPoolClient: true,
            allowedOauthFlows: config.cognito.oauthFlows,
            allowedOauthScopes: config.cognito.oauthScopes,
            callbackUrls: config.cognito.callbackUrls,
            generateSecret: true,
            userPoolId: userPool.id,
            supportedIdentityProviders: ["COGNITO"]
        });

        new TerraformOutput(this, 'UserPoolARN', { value: userPool.arn })
        new TerraformOutput(this, 'UserPoolClientSecret', { 
            sensitive : true,
            value: client.clientSecret })
        new TerraformOutput(this, 'UserPoolClientId', { value: client.id })

        this.userPoolArn = userPool.arn
        this.userPoolClientSecret = client.clientSecret
        this.userPoolClientId = client.id
        this.userPoolDomain = userPool.domain;
        this.userPoolClientOauthScopes = client.allowedOauthScopes
    }
}