import * as THREE from "three";
import { floorTextures, rugTexture, tuftNormalTexture, wallpaperTexture, woodTexture } from "./textures";

let mats: ReturnType<typeof build> | null = null;

function repeated(tex: THREE.Texture, rx: number, ry: number) {
  const t = tex.clone();
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(rx, ry);
  t.needsUpdate = true;
  return t;
}

function build() {
  const wood = woodTexture();
  const std = (p: THREE.MeshStandardMaterialParameters) => new THREE.MeshStandardMaterial(p);
  const floor = floorTextures();
  const tuft = tuftNormalTexture();
  const upholstery = (color: string, roughness: number) =>
    std({ color, roughness, normalMap: tuft, normalScale: new THREE.Vector2(0.75, 0.75) });
  return {
    floor: std({ ...floor, roughness: 1, metalness: 0, color: "#bfa792", normalScale: new THREE.Vector2(0.45, 0.45) }),
    darkWood: std({ map: wood, color: "#6b4a38", roughness: 0.42 }),
    wood: std({ map: wood, color: "#a07458", roughness: 0.45 }),
    blackWood: std({ map: wood, color: "#3a2a24", roughness: 0.6 }),
    panelWood: std({ map: repeated(wood, 2, 1), color: "#5a3a2a", roughness: 0.6 }),
    wallTeal: std({ map: wallpaperTexture("teal"), roughness: 0.9 }),
    wallRed: std({ map: wallpaperTexture("oxblood"), roughness: 0.9 }),
    backWall: std({ map: repeated(wallpaperTexture("teal"), 0.35, 0.35), roughness: 0.9 }),
    stone: std({ color: "#3a3532", roughness: 0.75 }),
    marble: std({ color: "#2e2926", roughness: 0.22, metalness: 0.05 }),
    soot: std({ color: "#120a06", roughness: 1, emissive: "#3a1004", emissiveIntensity: 0.6, side: THREE.BackSide }),
    brass: std({ color: "#b8893a", roughness: 0.35, metalness: 0.9 }),
    iron: std({ color: "#1c1e20", roughness: 0.6, metalness: 0.7 }),
    windowFrame: std({ color: "#2c3f3a", roughness: 0.5, metalness: 0.3 }),
    plaster: std({ color: "#3a3a36", roughness: 0.95 }),
    ceiling: std({ map: repeated(wood, 6, 6), color: "#2a1a12", roughness: 0.8 }),
    leather: upholstery("#6a2018", 0.38),
    leatherBrown: upholstery("#5a3018", 0.4),
    velvetTeal: upholstery("#22484a", 0.75),
    velvetBlue: std({ color: "#1c2a46", roughness: 0.9, side: THREE.DoubleSide }),
    velvetGreen: upholstery("#24402f", 0.75),
    shade: std({ color: "#f0c890", roughness: 0.9, emissive: "#ff9a48", emissiveIntensity: 0.9, side: THREE.DoubleSide }),
    cushion: std({ color: "#5a4a7a", roughness: 0.9 }),
    cloth: std({ color: "#18221e", roughness: 0.95, side: THREE.DoubleSide }),
    paper: std({ color: "#d8c9a6", roughness: 0.95, side: THREE.DoubleSide }),
    wax: std({ color: "#e8dcc0", roughness: 0.7, emissive: "#ff9a40", emissiveIntensity: 0.05 }),
    waxGreen: std({ color: "#7af0b8", roughness: 0.6, emissive: "#2aff9a", emissiveIntensity: 0.35 }),
    crt: std({ color: "#b4ab94", roughness: 0.6 }),
    teal: std({ color: "#3f7f86", roughness: 0.5, metalness: 0.3 }),
    log: std({ color: "#2a1a10", roughness: 0.9, emissive: "#ff4010", emissiveIntensity: 0.35 }),
    glassBottle: new THREE.MeshStandardMaterial({ color: "#3a6a4a", roughness: 0.1, metalness: 0.1, transparent: true, opacity: 0.7 }),
    amberBottle: new THREE.MeshStandardMaterial({ color: "#8a4a1a", roughness: 0.1, transparent: true, opacity: 0.75 }),
    rugEmber: std({ map: rugTexture("ember"), roughness: 0.95 }),
    rugTeal: std({ map: rugTexture("teal"), roughness: 0.95 }),
    rugWine: std({ map: rugTexture("wine"), roughness: 0.95 }),
    eye: new THREE.MeshBasicMaterial({ color: "#03110d" }),
    corridor: new THREE.MeshBasicMaterial({ color: "#2a170b", side: THREE.BackSide }),
  };
}

export function getMaterials() {
  if (!mats) mats = build();
  return mats;
}

export type Materials = ReturnType<typeof getMaterials>;
