# How to install gitlab runner in k8s cluster

### How to add a k8s cluster in gitlab official docs.
https://docs.gitlab.com/ee/user/project/clusters/add_remove_clusters.html

#### Important INFO extracted from the docs.

1. Create a file called `gitlab-admin-service-account.yaml` with contents:
```
apiVersion: v1
kind: ServiceAccount
metadata:
  name: gitlab
  namespace: kube-system
---
apiVersion: rbac.authorization.k8s.io/v1beta1
kind: ClusterRoleBinding
metadata:
  name: gitlab-admin
roleRef:
  apiGroup: rbac.authorization.k8s.io
  kind: ClusterRole
  name: cluster-admin
subjects:
  - kind: ServiceAccount
    name: gitlab
    namespace: kube-system

```
2. Make sure to use the token created automatically when creating this sercice account when you add the cluster to gitlab with UI.

3. Important section to get right for the config file for the helm chart, e.g.: `gitlab-substrate-ci-create-runner.yaml`
```
## For RBAC support:
rbac:
  create: true

  ## Run the gitlab-bastion container with the ability to deploy/manage containers of jobs
  ## cluster-wide or only within namespace
  serviceAccountName: gitlab-admin
  clusterWideAccess: true

  ## If RBAC is disabled in this Helm chart, use the following Kubernetes Service Account name.
  ##
  # serviceAccountName: default

## Configuration for the Pods that the runner launches for each new job
##
runners:
  ## Default container image to use for builds when none is specified
  ##
  image: ubuntu:18.04

  ## Run all containers with the privileged flag enabled
  ## This will allow the docker:stable-dind image to run if you need to run Docker
  ## commands. Please read the docs before turning this on:
  ## ref: https://docs.gitlab.com/runner/executors/kubernetes.html#using-docker-dind
  ##
  privileged: true
  serviceAccountName: gitlab-admin
  # !!!!  if helm install throughs errors do not ues an existing token
  # secret needs to be in kube-system namespace
  ## Namespace to run Kubernetes jobs in (defaults to 'default')
  ##
  namespace: kube-system



```
