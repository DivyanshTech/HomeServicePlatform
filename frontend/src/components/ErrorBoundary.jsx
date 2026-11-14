import {Component} from 'react';

export default class ErrorBoundary extends Component{
  constructor(props){super(props);this.state={error:null}}
  static getDerivedStateFromError(error){return {error}}
  componentDidCatch(error,info){console.error('FixIt UI error:',error,info)}
  render(){
    if(!this.state.error)return this.props.children;
    return <div className="min-h-screen grid place-items-center bg-slate-50 p-6"><div className="w-full max-w-xl rounded-2xl border border-red-200 bg-white p-6 shadow-sm"><h1 className="text-xl font-black text-slate-900">Something went wrong</h1><p className="mt-2 text-sm text-slate-600">The page hit an unexpected error. You can return to the dashboard without losing your login session.</p><button className="btn-primary mt-5" onClick={()=>{this.setState({error:null});window.history.pushState({},'',this.props.home||'/');window.dispatchEvent(new PopStateEvent('popstate'))}}>Return to home</button></div></div>
  }
}
