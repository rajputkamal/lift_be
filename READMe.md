# Welcome to the Lift BE

## Table of Content
+ [About the Repo](#lift)
+ [Installation and Tech-stack](#installation)

# Lift - Ride Sharing App

Lift is a simple and efficient ride-sharing application that allows users to offer rides and discover available rides based on their travel needs. 

The goal of Lift is to reduce travel costs, traffic congestion, and make commuting more convenient by connecting people traveling along similar routes.

# Installation 
This back-end app is developed using [Nodejs](https://nodejs.org/en) and [Express](https://expressjs.com/).

The entire code-base is available on [GitHub](https://github.com/rajputkamal/lift_be).

```bash
git clone https://github.com/rajputkamal/lift_be
```

Use the node package manager [NPM](https://www.npmjs.com/) to install all dependencies.

```bash
npm install
```
To get the `.env` file contact the developer.

To run the app in development mode.
```bash
npm run dev
```

## App is deployed on Google cloud provider

+ To understand the entire process connect with dev.

+ Query to see logs on GCP

    ``resource.type="cloud_run_revision"
    resource.labels.service_name="lift-be"
    ``
+ URL: https://console.cloud.google.com/logs/query;query=%0A;cursorTimestamp=2026-01-31T10:29:41.867668Z;duration=PT5M?project=lift-475112

## Command to get the LAN IP–based localhost URL

``ipconfig getifaddr en0``

## Made with ❤️ to simplify everyday travel.