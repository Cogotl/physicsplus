import Matter from "matter-js";
(function() {
    const vm = Scratch.vm;
    const runtime = vm.runtime;
    const div=document.createElement('div');
    div.style.position="fixed";
    div.style.width="480px";
    div.style.height="360px";
    div.style.zIndex="3939"
    div.style.top="50%"
    div.style.left="50%"
    div.style.transform="translate(-50%, -50%)"
    div.style.display="none"
    div.style.alignItems="center"
    div.style.justifyContent="center"
    div.style.background="linear-gradient(45deg,#fff,#fff) padding-box,linear-gradient(45deg, #390088, #8100dc) border-box"
    div.style.border="5px solid transparent"
    div.style.borderRadius="39px"
    div.style.overflow="hidden"
    div.id="physicsExtDebugPanel"
    document.body.appendChild(div)
    const { Engine, Render, Runner, Bodies, World } = Matter;
    const engine = Engine.create();
    const world = engine.world;
    const render = Render.create({element: div,engine: engine,options: {width: 480,height: 360,wireframes: false,background: "#222"}});
    div.style.width=`${render.canvas.width}px`
    div.style.height=`${render.canvas.height}px`
    Render.run(render);
    const runner = Matter.Runner.create();
    Matter.Runner.run(runner, engine);
    Matter.Render.lookAt(render, {
    min: { x: -480, y: -240 },
    max: { x: 480, y: 240 }
    });
    //bounds class
    class bounds {
        constructor(w,h,t) {
            this.w=w
            this.h=h
            this.t=t
            this.up=Bodies.rectangle(0, 0, 1, 1, { isStatic: true });
            this.down = Bodies.rectangle(0, 0, 1, 1, { isStatic: true });
            this.left = Bodies.rectangle(0, 0, 1, 1, { isStatic: true });
            this.right= Bodies.rectangle(0, 0, 1, 1, { isStatic: true });
            World.add(world, [this.up,this.down,this.left,this.right]);
            this.rectifyPos()
        }
        rectifyPos(){
            const upDownBounds=this.h/2+this.t/2
            const leftRightBounds=this.w/2+this.t/2
            World.remove(world,[this.up,this.down,this.left,this.right])
            this.up=Bodies.rectangle(0, -upDownBounds, this.w+this.t*2, this.t, { isStatic: true });
            this.down = Bodies.rectangle(0, upDownBounds, this.w+this.t*2, this.t, { isStatic: true });
            this.left = Bodies.rectangle(-leftRightBounds, 0, this.t, this.h+this.t*2, { isStatic: true });
            this.right= Bodies.rectangle(leftRightBounds, 0, this.t, this.h+this.t*2, { isStatic: true });
            World.add(world, [this.up,this.down,this.left,this.right]);
        }
        alterDims(dW,dH){
            this.w=dW
            this.h=dH
            this.rectifyPos()
        }
    }
    //physicsObject class
    class physicsObject{
        constructor(x,y,w,h,isStaticValue){
            this.width=1
            this.height=1
            this.body= Bodies.rectangle(x,-y,this.width,this.height)
            World.add(world,this.body)
            this.alterSize(w,h)
            Matter.Body.setStatic(this.body,isStaticValue)
        }
        alterSize(dW,dH){
            const deltaWidth=dW==="*"?this.width:dW
            const deltaHeight=dH==="*"?this.height:dH
            Matter.Body.scale(this.body, 1/this.width, 1/this.height);
            this.width=deltaWidth||39
            this.height=deltaHeight||39
            Matter.Body.scale(this.body, this.width, this.height);
        }
        deleteBody(){
            World.remove(world,this.body)
        }
    }
    class physicsext {
        constructor() {
            this.worldBounds=new bounds(vm.runtime.stageWidth,vm.runtime.stageHeight,10)
            this.physicsClones={}//sprite physics bodies
            this.physicsBodies={}//physics bodies created programitically and not attached to any sprite
            this.constraints={}
            this.runtime=vm.runtime
            this.running={}
            this.physicsDebugger="Show"
            this.isPaused=false
            vm.runtime.on('PROJECT_START', () => {
                // delete previous sprite physics clones
                this.clearAllPhysicsClones()
                this.clearAllPhysicsBodies()
                this.clearAllConstraints()//remove all constriants
                runner.enabled=true
            });
            vm.runtime.on('RUNTIME_PAUSED', () => {
                this.isPaused=true
            });

            vm.runtime.on('RUNTIME_UNPAUSED', () => {
                this.isPaused=false
            });
            //pause physics simulations on project pause
            const loop = () => {
                runner.enabled=!this.isPaused
                if (!this.isPaused) {
                    console.log("Running physics simulations!");
                    this.clearAllExtraClones()
                    Object.keys(this.running).forEach(spriteID => {
                        const sprite=this.running[spriteID]
                        const physicsID=this.physID('sprite',sprite.id)
                        if (physicsID in this.physicsClones){
                            const physicsClone=this.physicsClones[physicsID].body
                            sprite.setXY(physicsClone.position.x,-physicsClone.position.y)
                            sprite.setDirection(physicsClone.angle*(180 / Math.PI)+90)
                        }
                    });
                }
                requestAnimationFrame(loop);
            };
            loop();
        }
        getInfo() {
            return {
                id: 'physicsext',
                name: 'Physics+',
                color1: "#c54500",
                blocks: [
                    {
                        blockType: Scratch.BlockType.BUTTON,
                        func: `${this.physicsDebugger}Debug`,
                        text: `${this.physicsDebugger} Physics Debugger`,
                    },
                    {
                        blockType: Scratch.BlockType.LABEL,
                        text:'World'
                    },
                    {
                        blockType: Scratch.BlockType.COMMAND,
                        opcode:'setBounds',
                        text:'Set boundaries of physics stage to X: [W] Y: [H]',
                        arguments:{
                            W:{type:Scratch.ArgumentType.NUMBER,defaultValue:vm.runtime.stageWidth},
                            H:{type:Scratch.ArgumentType.NUMBER,defaultValue:vm.runtime.stageHeight},
                        }
                    },
                    {
                        blockType: Scratch.BlockType.COMMAND,
                        opcode:'setBoundsAuto',
                        text:'Sync physics stage boundaries to project stage boundaries',
                    },
                    {
                        blockType: Scratch.BlockType.LABEL,
                        text:'Sprite Physics',
                        filter: [Scratch.TargetType.SPRITE]
                    },
                    {
                        blockType: Scratch.BlockType.COMMAND,
                        opcode:'enablePhysics',
                        text:'Enable physics for this sprite with [T] motion',
                        arguments:{
                            T:{type:Scratch.ArgumentType.STRING,menu:'STATICVALUES'}
                        },
                        filter: [Scratch.TargetType.SPRITE]
                    },
                    {
                        blockType: Scratch.BlockType.COMMAND,
                        opcode:'disablePhysics',
                        text:'Disable physics for this sprite',
                        filter: [Scratch.TargetType.SPRITE]
                    },
                    {
                        blockType: Scratch.BlockType.COMMAND,
                        opcode:'spriteResizePhysicsHitbox',
                        text:'Set the [D] of this sprite\'s hitbox to [V]',
                        arguments:{
                            D:{type:Scratch.ArgumentType.STRING,menu:'DIMENSION'},
                            V:{type:Scratch.ArgumentType.NUMBER},         
                        },
                        filter: [Scratch.TargetType.SPRITE]
                    },
                    {
                        blockType: Scratch.BlockType.REPORTER,
                        opcode:'getSpritePhysicsValue',
                        text:'[PARAM] of this sprite',
                        arguments:{
                            PARAM:{type:Scratch.ArgumentType.STRING,menu:'PHYSICSGETPARAMS'}
                        },
                        filter: [Scratch.TargetType.SPRITE],
                        disableMonitor:true
                    },
                    {
                        blockType: Scratch.BlockType.REPORTER,
                        opcode:'getSelfPhysicsID',
                        text:'This sprite\'s physics ID',
                        filter: [Scratch.TargetType.SPRITE],
                        disableMonitor:true
                    },
                    {
                        blockType: Scratch.BlockType.LABEL,
                        text:'Physics Motion',
                        filter: [Scratch.TargetType.SPRITE]
                    },
                    {
                        blockType: Scratch.BlockType.COMMAND,
                        opcode:'spriteSetPosition',
                        text:'go to x:[X] y:[Y]',
                        arguments:{
                            X:{type:Scratch.ArgumentType.NUMBER,defaultValue:0},
                            Y:{type:Scratch.ArgumentType.NUMBER,defaultValue:0},
                        },
                        filter: [Scratch.TargetType.SPRITE]
                    },
                    {
                        blockType: Scratch.BlockType.COMMAND,
                        opcode:'spriteSetRotation',
                        text:'point in direction [D]',
                        arguments:{
                            D:{type:Scratch.ArgumentType.ANGLE,defaultValue:0},
                        },
                        filter: [Scratch.TargetType.SPRITE]
                    },
                    "---",
                    {
                        blockType: Scratch.BlockType.COMMAND,
                        opcode:'applyForceByResolution',
                        text:'Apply force of X[MX] Y[MY] on this sprite',
                        arguments:{
                            MX:{type:Scratch.ArgumentType.NUMBER},
                            MY:{type:Scratch.ArgumentType.NUMBER},
                        },
                        filter: [Scratch.TargetType.SPRITE]
                    },
                    {
                        blockType: Scratch.BlockType.COMMAND,
                        opcode:'applyForceByAngle',
                        text:'Apply force of [M] on this sprite in direction[D]',
                        arguments:{
                            M:{type:Scratch.ArgumentType.NUMBER},
                            D:{type:Scratch.ArgumentType.ANGLE},
                        },
                        filter: [Scratch.TargetType.SPRITE]
                    },
                    "---",
                    {
                        blockType: Scratch.BlockType.COMMAND,
                        opcode:'spriteSetVectorPropertyByResolution',
                        text:'Set [PARAM] on this sprite to X:[VX] Y:[VY]',
                        arguments:{
                            PARAM:{type:Scratch.ArgumentType.STRING,menu:'physics_vector_params'},
                            VX:{type:Scratch.ArgumentType.NUMBER},
                            VY:{type:Scratch.ArgumentType.NUMBER},
                        },
                        filter: [Scratch.TargetType.SPRITE]
                    },
                    {
                        blockType: Scratch.BlockType.COMMAND,
                        opcode:'spriteSetVectorPropertyByAngle',
                        text:'Set [PARAM] on this sprite to [M] in direction [DIR]',
                        arguments:{
                            PARAM:{type:Scratch.ArgumentType.STRING,menu:'physics_vector_params'},
                            M:{type:Scratch.ArgumentType.NUMBER},
                            DIR:{type:Scratch.ArgumentType.ANGLE},
                        },
                        filter: [Scratch.TargetType.SPRITE]
                    },                    
                    {
                        blockType: Scratch.BlockType.COMMAND,
                        opcode:'spriteSetScalarProperty',
                        text:'Set [PARAM] of this sprite to [V]',
                        arguments:{
                            PARAM:{type:Scratch.ArgumentType.STRING,menu:'physics_scalar_params'},
                            V:{type:Scratch.ArgumentType.NUMBER},
                        },
                        filter: [Scratch.TargetType.SPRITE]
                    },
                    {
                        blockType: Scratch.BlockType.LABEL,
                        text:'Constraints'
                    },
                    {
                        blockType: Scratch.BlockType.COMMAND,
                        opcode:'newConstraintBetweenPhysicsSprites',
                        text:'Add a new constraint called [NAME] between body of [ID1] with an offset of X[X1] Y[Y1] and body of [ID2] with an offset of X[X2] Y[Y2] with a length of [LENGTH] and stiffness of [STIFFNESS]',
                        arguments:{
                            ID1:{type:Scratch.ArgumentType.STRING},
                            X1:{type:Scratch.ArgumentType.NUMBER},
                            Y1:{type:Scratch.ArgumentType.NUMBER},
                            ID2:{type:Scratch.ArgumentType.STRING},
                            X2:{type:Scratch.ArgumentType.NUMBER},
                            Y2:{type:Scratch.ArgumentType.NUMBER},
                            LENGTH:{type:Scratch.ArgumentType.NUMBER},
                            STIFFNESS:{type:Scratch.ArgumentType.NUMBER},
                            NAME:{type:Scratch.ArgumentType.STRING}
                        },
                    },
                    {
                        blockType: Scratch.BlockType.COMMAND,
                        opcode:'deletePhysicsConstraint',
                        text:'delete constraint named [NAME]',
                        arguments:{
                            NAME:{type:Scratch.ArgumentType.STRING}
                        },
                    },
                                    //debug blocks
                    {
                        blockType: Scratch.BlockType.LABEL,
                        text:'debug',
                        hideFromPalette: true
                    },
                    {
                        blockType: Scratch.BlockType.COMMAND,
                        opcode:'clearAllExtraClones',
                        text:'clear all excess physics clone (debug)',
                        hideFromPalette: true
                    },
                    {
                        blockType: Scratch.BlockType.REPORTER,
                        opcode:'allRunning',
                        text:'all running physics sprites (debug)',
                        hideFromPalette: true
                    },
                    {
                        blockType: Scratch.BlockType.COMMAND,
                        opcode:'moveToPhysics',
                        text:'Sync this sprite\'s position to physics object (debug)',
                        hideFromPalette: true
                    }
                ],
                menus: {
                STATICVALUES: {
                    acceptReporters: false,
                    items: ["Free","Static"]
                },
                DIMENSION: {
                    acceptReporters: false,
                    items: ["Width","Height"]
                },
                PHYSICSGETPARAMS: {
                    acceptReporters: false,
                    items: ["force","torque","positionImpulse","constraintImpulse","totalContacts","speed","angularSpeed","velocity","angularVelocity","isStatic","motion","density","restitution","friction","frictionStatic","frictionAir","circleRadius","area","mass","inertia"]
                },
                physics_vector_params:{
                    acceptReporters: false,
                    items: ["force","velocity"]
                },
                physics_scalar_params:{
                    acceptReporters: false,
                    items: ["torque","density","restitution","angularVelocity","mass","circleRadius"]
                },
                ROTATION_STYLES:{
                    acceptReporters: false,
                    items: [
                        {"text":"all around","value":"true"},
                        {"text":"static","value":"false"}
                    ]
                }
                }
            };
        }
        physID(mode,ID){
            return `${mode}-physics-id-${ID}`;
        }
        //vector and scalar operations
        setPhysicsVectorByResolution(body,vectorParam,mx,my){
            const magX=mx
            const magY=-my //account for the fact that - is upwards for some reason
            body[vectorParam]={x:magX,y:magY}
        }
        setPhysicsVectorByAngle(body,vectorParam,m,angle,isInRadians){
            const appliedAngle = isInRadians
                ? angle
                : angle * Math.PI / 180;

            this.setPhysicsVectorByResolution(
                body,
                vectorParam,
                m * Math.cos(appliedAngle),
                m * Math.sin(appliedAngle)
            );
        }
        setPhysicsScalar(body,m,scalarParam){
            body[scalarParam]=m
        }
        //functions to remove physics bodies
        removePhysicsClone(id){
            if (id in this.physicsClones){
                this.physicsClones[id].deleteBody();
                delete this.physicsClones[id];
                delete this.running[id];
            }
        }
        clearAllPhysicsClones(){
            for (const id of Object.keys(this.physicsClones)){
                this.removePhysicsClone(id)
            }
        }
        clearAllPhysicsBodies(){
            for (const id of Object.keys(this.physicsBodies)){
                this.physicsBodies[id].deleteBody();
                delete this.physicsBodies[id];
            }
        }
        clearAllExtraClones(){
            const validIDs=this.getAllSpriteIds().map(id => this.physID('sprite', id))
            for (const key of Object.keys(this.physicsClones)) {
                if (!validIDs.includes(key)) {
                    console.log(`deleting physics clone of sprite with ID ${key} as it no longer exists.`)
                    this.removePhysicsClone(key)
                }
            }
        }
        clearAllConstraints(){
            for (const key of Object.keys(this.constraints)) {
                Matter.World.remove(world, this.constraints[key]);
                delete this.constraints[key];
            }
        }

        getPhysicsValue(body,param){
            return body[param]
        }
        getSelfPhysicsID(args,util){
            return this.physID("sprite",util.target.id) 
        }
        //world boundaries
        setBounds(args){
            this.worldBounds.alterDims(args.W,args.H)
        }
        setBoundsAuto(args){
            this.worldBounds.alterDims(vm.runtime.stageWidth,vm.runtime.stageHeight)
        }
        //debug panel
        ShowDebug(){
            document.getElementById('physicsExtDebugPanel').style.display="flex"
            this.physicsDebugger="Hide"
            Scratch.vm.extensionManager.refreshBlocks()
        }
        HideDebug(){
            document.getElementById('physicsExtDebugPanel').style.display="none"
            this.physicsDebugger="Show"
            Scratch.vm.extensionManager.refreshBlocks()
        }
        allRunning(){
            return(Object.keys(this.running))
        }
        getAllSpriteIds() {
            return(runtime.targets.map(item => item.id))
        }
        //sprite physics
        enablePhysics(args,util){
            const id=this.physID('sprite',util.target.id)
            this.running[id]=util.target
            if (id in this.physicsClones){
                return
            }
            this.physicsClones[id]=new physicsObject(util.target.x,util.target.y,39,39,args.T==="Static")
        }
        disablePhysics(args,util){
            this.removePhysicsClone(this.physID('sprite',util.target.id))
        }
        moveToPhysics(args,util){//moves the sprite to its physics position
            const target=util.target
            if (this.physID('sprite',target.id) in this.physicsClones){
                const physicsClone=this.physicsClones[this.physID('sprite',target.id)]["body"]
                target.setXY(physicsClone.position.x,-physicsClone.position.y)
                const spriteAngle = physicsClone.angle * 180 / Math.PI;//convert to deg, then add 90 since scratch angle system is like that
                target.setAngle(spriteAngle)
            }
        }
        applyForceByResolution(args,util){
            const id=this.physID('sprite',util.target.id)
            if (id in this.physicsClones){
                const targetBody=this.physicsClones[id].body
                const force={x:args.MX,y:-1*args.MY/*account for up being negative*/}
                Matter.Body.applyForce(targetBody, targetBody.position, force)
            }  
        }
        applyForceByAngle(args,util){//apply force in terms of direction and magnitude
            const id=this.physID('sprite',util.target.id)
            if (id in this.physicsClones){
                const targetBody=this.physicsClones[id].body
                const angle = (args.D-90) * (Math.PI / 180);//account for Scratch angles starting from 0 at the top(for some reason) and also convert to radians
                const forceX=args.M*Math.cos(angle)
                const forceY=args.M*Math.sin(angle)
                const force={x:forceX,y:forceY}
                Matter.Body.applyForce(targetBody, targetBody.position, force)
            }
        }
        getSpritePhysicsValue(args,util){//returns physics value of a sprite
            const id=this.physID('sprite',util.target.id)
            if (id in this.physicsClones){
                return this.getPhysicsValue(this.physicsClones[id].body,args.PARAM)
            }
        }
        spriteSetVectorPropertyByResolution(args,util){//set a vector value manually in terms of its X and Y magnitude. Use with caution since this one is a lil wonky :3
            const id=this.physID('sprite',util.target.id)
            if (id in this.physicsClones){
                this.setPhysicsVectorByResolution(this.physicsClones[id].body,args.PARAM,args.VX,args.VY)
            }
        }
        spriteSetVectorPropertyByAngle(args,util){//set a vector value manually in terms of its magnitude and direction
            const id=this.physID('sprite',util.target.id)
            if (id in this.physicsClones){
                this.setPhysicsVectorByAngle(this.physicsClones[id].body,args.PARAM,args.M,args.DIR,false)
            }
        }
        spriteSetScalarProperty(args,util){//set a scalar value, like inertia, resitution etc
            const id=this.physID('sprite',util.target.id)
            if (id in this.physicsClones){
                this.setPhysicsScalar(this.physicsClones[id].body,args.PARAM,args.V)
            }
        }
        spriteResizePhysicsHitbox(args,util){
            const target=util.target
            if (this.physID('sprite',target.id) in this.physicsClones){
                const physicsClone=this.physicsClones[this.physID('sprite',target.id)]
                physicsClone.alterSize(args.D==="Width"?args.V:"*",args.D==="Height"?args.V:"*")
            }
        }

        spriteSetPosition(args,util){
            const target=util.target
            if (this.physID('sprite',target.id) in this.physicsClones){
                const physicsClone=this.physicsClones[this.physID('sprite',target.id)]["body"]
                Matter.Body.setPosition(physicsClone, {
                    x: args.X,
                    y: -args.Y
                });
            }
        }
        spriteSetRotation(args,util){
            const target=util.target
            if (this.physID('sprite',target.id) in this.physicsClones){
                const physicsClone=this.physicsClones[this.physID('sprite',target.id)]["body"]
                Matter.Body.setAngle(physicsClone, (args.D-90) * Math.PI / 180);
            }
        }
        newConstraintBetweenPhysicsSprites(args){
            this.createNewConstraint(
                args.ID1,
                {x:args.X1,y:-args.Y1},
                args.ID2,
                {x:args.X2,y:-args.Y2},
                args.LENGTH,
                args.STIFFNESS,
                args.NAME
            )
        }
        createNewConstraint(bodyA, offsetA, bodyB, offsetB, length,stiffness,name){
            if(name in this.constraints){
                console.warn("constraint already exists. Exiting...")
                return;
            }
            if (!(bodyA in this.physicsClones) || !(bodyB in this.physicsClones)){
                console.error("Physics object not found")
                return;
            }

            const newConstraint = Matter.Constraint.create({
                bodyA: this.physicsClones[bodyA].body,
                pointA: offsetA,
                bodyB: this.physicsClones[bodyB].body,
                pointB: offsetB,
                length: length,
                stiffness: stiffness
            });
            this.constraints[name]=newConstraint 
            Matter.World.add(world, newConstraint)

        }
        deletePhysicsConstraint(args){
            if (args.NAME in this.constraints){
                Matter.World.remove(world, this.constraints[args.NAME]);
                delete this.constraints[args.NAME];
                return;
            }
            console.warn("constraint not found")
        }
    }
    Scratch.extensions.register(new physicsext());
})();