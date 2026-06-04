#define LOGFILE "/zone/null/eternal/objects/clothes.log"
#define CLOTHES "/zone/null/eternal/objects/cloth"
string Cname, Cshort, Clong;
object editor, customer;
mapping customers;

varargs void clear_all( string msg );
void set_desc();
void get_Cshort( string str );
void get_Clong( string str );

clothes_init() {
    add_action("order", "order");
}

varargs void clear_all(string msg) {
	if( objectp(editor) ) destruct(editor);
	if( !objectp(customer) ) return;
	if( stringp(msg) ) tell_object( customer, msg );
	customer = 0;
}

order(string str) {
    if( !stringp(str) ) return 0;

    if( invalid_string(str) ) {
        write("Invalid characters in order string.\n");
        return 1;
    }

    if( objectp(customer) && customer != THISP && present(customer,THISO) ) {
        printf("Ambrose is busy helping %s.\n", customer->query_name() );
        return 1;
    }

    if( !mappingp(customers) ) customers = ([]);
    else if(member(customers,PRNAME) && customers[PRNAME] == 10) {
        write( "Ambrose says: Only 10 items per reset, sorry.\n");
        return 1;
    }

    clear_all();
    customer = THISP;
    say(sprintf("%s asks Ambrose to get something for %s.\n", PNAME,
        objective(THISP) ));

    if( sscanf(str, "<%s> <%s> <%s>", Cname, Cshort, Clong) == 3) {
        Clong+="\n";
        if(strlen(Cshort) > 70) {
            clear_all("Short description too long, aborting.\n");
            return 1;
		}
        set_desc();
        return 1;
    }

    if( sscanf(str, "%s",Cname) == 1) {
        write("Ambrose says: Could you give me a short description of what you want, please?\n");
        write("--->");
        input_to("get_Cshort");
        return 1;
    }

    return 0;
}

void get_Cshort( string str ) {
    if( !stringp(str) || invalid_string(str) || (sscanf(str, "%s\n%s") > 1) ) {
        clear_all("Invalid short description, aborting.\n");
        return;
	}

    if(strlen(str) > 70 ) {
        clear_all("Short description too long, aborting.\n");
        return;
    }

    Cshort = str;
    write("Ambrose says: Hmm... Could you please describe it to me, exactly?\n");
    write("       I want to make sure I get the right one.\n");
    write("(invoking the editor to get the long description)\n");
    editor = clone_object(EDITOR);
    editor->get_text(THISO, "get_Clong");
}

void get_Clong(string str) {
    if( !stringp(str) || invalid_string(str) ) {
        clear_all("Invalid long description, aborting\n");
        return;
	}

    Clong = str;
    set_desc ();
}

set_desc(){
    object ob;

    seteuid(getuid(THISO));
    ob = clone_object( CLOTHES );
    ob->set("id", ({"clothes", Cname }) );
    ob->set("short", (Cshort + " (apparel)") );
    ob->set("long", Clong);
    move_object (ob, customer);
    say("Ambrose takes a couple measurements of "+PNAME+".\n");
    write("Ambrose takes a few measurements of you with his tape.\n");
    tell_room(THISO,"He walks away, and quickly returns with "+Cshort+",\n");
    say("which he gives to "+PNAME+".\n");
    clear_all("which he gives to you.\n");
    write_file(LOGFILE, sprintf("%-15s : %s [%s]\n", CPRNAME, Cshort, Cname));

    if(member(customers,PRNAME)) customers[PRNAME]++;
    else customers += ([PRNAME : 1]);

    return 1;
}


extra_reset() {
   customers = ([]);
   if( objectp(customer) && !present(customer, THISO)) clear_all();
}
