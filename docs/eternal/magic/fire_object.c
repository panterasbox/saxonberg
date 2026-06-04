// Death 3/27/94
// An evil object that burns the person holding it for x turns

inherit ObjectCode;
#undef ENV
#define ENV environment(THISO)

extra_create() {
    set("short","Burning flames");
    set("id","fire");
    add("id","flames");
    add("id","FireObject");
    set("long","You are on fire!\n");
    set( FlamingP, 1 );
}

extra_init() {
    if (!living(ENV)) {
	go_out();
	return;
    }

    call_out("burn_me",1);
}


burn_me() {
    object env;
    env=environment(THISO);

    if (!living(env)) {
	go_out();
	return;
    }

    env->take_damage(random(10),0,"fire",THISO);
    tell_room(environment(env),env->query_name() + " is on fire!\n",({ENV}));
    tell_object(env,"You are on fire!\n");
    if(random(env->query_stat("wil")) < 20)
	command("scream",env);
    if(random(env->query_stat("wil")) < 15) {
	tell_room(environment(env),env->query_name() + " panics and attempts to flee!\n",({env}));
	tell_object(env,"You panic and attempt to flee!\n");
	env->run_away();
    }
    if (random(100) < 85) {
	call_out("burn_me",1);
	return;
    }
    go_out();
    return;
}

go_out() {
    if(living(ENV)) {
	tell_room(environment(ENV),ENV->query_name() + " manages to put out a fire.\n",({ENV}));
	tell_object(ENV,"You manage to put the fire out.\n");
    }

    destruct(THISO);
}

drop(int silent) {
    return 1;
}
