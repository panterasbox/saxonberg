inherit ThingCode;
 
void extra_create() {
    set(InvisP,1);
}
 
void extra_init() {
    add_action("racism_check", "buy");
    add_action("racism_check", "sell");
    add_action("racism_check", "list");
}
 
racism_check() {
    object kilbor;
    kilbor=present( "kilbor", ENV(THISP) );
    if( THISP->query_race()!="Gnome" ) {
      destruct(THISO);
      return 0;
    }
    if( kilbor ) {
      command("spit", kilbor );
      command("say why don't you go mine some coal or "
        "somethin', you half-pint gnome!", kilbor );
      command("raise "+PRNAME, kilbor );
      return 1;
    }
    return 0;
}
 
query_kilbor_racism_object() {
    return 1;
}
