import { Construct } from 'constructs';
import { Token, TerraformOutput } from 'cdktf';
import { readFileSync } from 'fs';
import { DataAwsAmi } from "@cdktf/provider-aws/lib/data-aws-ami";
import { SecurityGroup } from "@cdktf/provider-aws/lib/security-group";
import { SecurityGroupRule } from "@cdktf/provider-aws/lib/security-group-rule";
import { IamRole } from "@cdktf/provider-aws/lib/iam-role";
import { IamRolePolicyAttachment } from "@cdktf/provider-aws/lib/iam-role-policy-attachment";
import { IamInstanceProfile } from "@cdktf/provider-aws/lib/iam-instance-profile";
import { LaunchTemplate } from "@cdktf/provider-aws/lib/launch-template";
import { AlbTargetGroup } from "@cdktf/provider-aws/lib/alb-target-group";
import { Alb } from "@cdktf/provider-aws/lib/alb";
import { LbListener } from "@cdktf/provider-aws/lib/lb-listener";
import { AlbListenerRule } from "@cdktf/provider-aws/lib/alb-listener-rule";
import { AutoscalingGroup } from "@cdktf/provider-aws/lib/autoscaling-group";
import { CognitoOptions } from './cognito';

export interface WebServiceProps {
    readonly userPoolArn: string;
    readonly userPoolClientId: string;
    config: CognitoOptions;
}

export class WebService extends Construct {
    constructor(scope: Construct, name: string, props: WebServiceProps ) {
        super(scope, name);

        const ami = new DataAwsAmi(this, 'amazonlinux', {
            mostRecent: true,
            owners: ["amazon"],
            filter: [
                {
                    name: "root-device-type",
                    values: ["ebs"] 
                },
                {
                    name: "virtualization-type",
                    values: ["hvm"]
                }
            ]
        });

        const elbSecurityGroup = new SecurityGroup(this, 'elb-sg', {
            name: props.config.name + '-elb',
            vpcId: props.config.vpcId,
            egress: [{
                fromPort: 0,
                toPort: 0,
                protocol: '-1',
                cidrBlocks: ["0.0.0.0/0"]
            }],
            ingress: [
                {
                    fromPort: 80,
                    toPort: 80,
                    protocol: 'tcp',
                    cidrBlocks: ["0.0.0.0/0"]
                },
                {
                    fromPort: 443,
                    toPort: 443,
                    protocol: 'tcp',
                    cidrBlocks: ["0.0.0.0/0"]
                }
            ]
        });

        const instanceSecurityGroup = new SecurityGroup(this, 'instance-sg', {
            name: props.config.name + '-webservice',
            vpcId: props.config.vpcId,
        });

        new SecurityGroupRule(this, 'instance-sg-rule', {
            type: "ingress",
            fromPort: 0,
            toPort: 65535,
            protocol: "tcp",
            sourceSecurityGroupId: Token.asString(elbSecurityGroup.id),
            securityGroupId: Token.asString(instanceSecurityGroup.id)
        });

        const role = new IamRole(this, 'instance-role', {
            name: props.config.name + '-webservice-role',
            assumeRolePolicy: JSON.stringify({
                Version: "2012-10-17",
                Statement: [{
                    Effect: "Allow",
                    Principal: {
                        Service: "ec2.amazonaws.com"
                    },
                    Action: "sts:AssumeRole",
                    Sid: ""
                }]
            })
        });

        new IamRolePolicyAttachment(this, 'instance-iam-attachment', {
            role: role.name as string,
            policyArn: 'arn:aws:iam::aws:policy/AmazonSSMManagedInstanceCore'
        });

        const instanceProfile = new IamInstanceProfile(this, 'instance-profile', {
            name: props.config.name + '-webservice-instance-profile',
            role: role.name
        });

        const userDataScript = readFileSync('./user_data.sh', 'base64');

        const autoscalingTemplate = new LaunchTemplate(this, 'launch-template', {
            name: props.config.name + '-webservice',
            instanceType: props.config.webservice.instanceType,
            iamInstanceProfile: { arn: instanceProfile.arn },
            imageId: ami.id,
            vpcSecurityGroupIds: [instanceSecurityGroup.id],
            userData: userDataScript
        });

        const alb = new Alb(this, 'alb', {
            name: props.config.name,
            internal: false,
            loadBalancerType: "application",
            securityGroups: [Token.asString(elbSecurityGroup.id)],
            subnets: props.config.publicSubnetIds
        });

        const targetGroup = new AlbTargetGroup(this, 'tg', {
            name: props.config.name + '-root',
            port: 80,
            protocol: "HTTP",
            vpcId: props.config.vpcId,
            healthCheck: {
                path: "/",
                protocol: "HTTP",
                matcher: "200",
                interval: 10,
                timeout: 3,
                healthyThreshold: 2,
                unhealthyThreshold: 2
            }
        });

        const httpListener = new LbListener(this, 'listener-http', {
            loadBalancerArn: alb.arn,
            port: 443,
            protocol: "HTTPS",
            sslPolicy: "ELBSecurityPolicy-2016-08",
            certificateArn: props.config.webservice.certificateArn,
            defaultAction: [{
                type: "forward",
                targetGroupArn: Token.asString(targetGroup.arn)
            }]
        });

        new AlbListenerRule(this, 'listener-auth', {
            listenerArn: Token.asString(httpListener.arn),
            priority: 100,
            action: [
                {
                    type: "authenticate-cognito",
                    authenticateCognito: {
                        scope: "openid",
                        userPoolArn: props.userPoolArn,
                        userPoolClientId: props.userPoolClientId,
                        userPoolDomain: props.config.cognito.domain
                    }
                },
                {
                    type: "forward",
                    targetGroupArn: Token.asString(targetGroup.arn)
                }
            ],
            condition: [{
                pathPattern: {
                    values: [props.config.webservice.authenticationPath]
                }
            }]
        });

        new AutoscalingGroup(this, 'autoscaling-group', {
            name: props.config.name + '-group',
            minSize: props.config.webservice.minSize,
            maxSize: props.config.webservice.maxSize,
            desiredCapacity: props.config.webservice.desiredCapacity,
            vpcZoneIdentifier: props.config.privateSubnetIds,
            targetGroupArns: [targetGroup.arn],
            healthCheckType: "ELB",
            launchTemplate: {
                id: autoscalingTemplate.id,
                version: "$Latest"
            },
            tag: [{
                key: "Name",
                value: props.config.name + '-webservice',
                propagateAtLaunch: true
            }]
        });

        new TerraformOutput(this, 'ELBDomainName', { value: alb.dnsName });
        new TerraformOutput(this, 'CallBackURL', { value: alb.dnsName+'/oauth2/idpresponse' });
        new TerraformOutput(this, 'AuthenticationPath', { value: alb.dnsName+'/users/users.html' });
    }
}