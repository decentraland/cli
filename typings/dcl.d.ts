declare namespace DCL {
  interface DisplaySettings {
    title: string,
    favicon: string,
  }

  interface ContactSettings {
    name: string,
    email: string,
  }

  interface ContactSettings {
    name: string,
    email: string,
  }

  interface SceneSettings {
    base: string,
    parcels: Array<string>
  }

  interface CommunicationsSettings {
    type: string,
    signalling: string
  }

  interface PolicySettings {
    contentRating: string,
    fly: string,
    voiceEnabled: string,
    blacklist: Array<string>,
    teleportPosition: string
  }

  interface SceneMetadata {
    display: DisplaySettings,
    owner: string,
    contact: ContactSettings,
    main: string,
    tags: Array<string>,
    scene: SceneSettings,
    communications: CommunicationsSettings,
    policy: PolicySettings
  }
}
